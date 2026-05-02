from fastapi import FastAPI, HTTPException, Security, Depends, status, UploadFile, File, Form
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import os
import io
import pypdf
import docx
import hashlib  # STRIDE -- Repudiation --> Hash file content for audit trail
import time  # STRIDE -- Denial of Service --> Track request timestamps
from collections import defaultdict  # STRIDE -- Denial of Service --> Rate limiting per user

from dotenv import load_dotenv
load_dotenv()

from rag_service import LegalRAGService, query_legal_agent

# Initialize FastAPI app
app = FastAPI(
    title="Legal RAG API",
    description="API for Pakistani Legal Document RAG System",
    version="1.0.0"
)

# --- SECURITY SETUP START ---
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)
INTERNAL_API_KEY = os.getenv("MY_INTERNAL_API_KEY", "dev_secret_key_123")

# STRIDE -- Denial of Service --> Rate limiting storage
rate_limit_store = defaultdict(list)  # {api_key: [timestamp1, timestamp2, ...]}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 20  # max requests per window

def check_rate_limit(api_key: str) -> bool:
    """
    STRIDE -- Denial of Service --> Check if request exceeds rate limit
    Returns True if within limit, False if exceeded
    """
    current_time = time.time()
    
    # Clean old timestamps outside the window
    rate_limit_store[api_key] = [
        ts for ts in rate_limit_store[api_key]
        if current_time - ts < RATE_LIMIT_WINDOW
    ]
    
    # Check if limit exceeded
    if len(rate_limit_store[api_key]) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    
    # Add current timestamp
    rate_limit_store[api_key].append(current_time)
    return True

async def verify_api_key(api_key_header: str = Security(api_key_header)):
    # STRIDE -- Spoofing --> Verify API key to prevent unauthorized access
    if api_key_header == INTERNAL_API_KEY:
        # STRIDE -- Denial of Service --> Check rate limit
        if not check_rate_limit(api_key_header):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later."
            )
        return api_key_header
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Could not validate credentials. Invalid API Key."
        )
# --- SECURITY SETUP END ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global service variable
rag_service = None

def get_rag_service():
    """Lazy loader for RAG service"""
    global rag_service
    if rag_service is None:
        print("⏳ Initializing RAG Service on first request...")
        try:
            rag_service = LegalRAGService()
            rag_service.initialize()
            print("✅ RAG Service Initialized!")
        except Exception as e:
            print(f"❌ Failed to initialize RAG service: {e}")
            raise HTTPException(status_code=500, detail=f"Service initialization failed: {str(e)}")
    return rag_service

# Request/Response Models
class QueryRequest(BaseModel):
    query: str
    thread_id: Optional[str] = None
    verbose: Optional[bool] = False

class QueryResponse(BaseModel):
    answer: str
    thread_id: str
    is_legal_query: bool
    is_comparison: bool
    is_procedure: bool = False
    sub_queries: Optional[List[str]] = None
    reasoning: Optional[Dict[str, Any]] = None
    is_draft: bool = False
    file_data: Optional[str] = None # Base64 string
    filename: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    message: str

class SessionResponse(BaseModel):
    thread_id: str
    message: str
    messages: List[Dict[str, Any]]

# --- REMOVED THE STARTUP EVENT TO FIX TIMEOUT ---

@app.get("/", response_model=HealthResponse)
async def root():
    return {"status": "healthy", "message": "Legal RAG API is running"}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    # Simple check that doesn't trigger heavy loading
    return {"status": "healthy", "message": "Service is reachable"}

def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    STRIDE -- Tampering --> Sanitize filename to prevent path traversal
    STRIDE -- Elevation of Privilege --> Prevent directory traversal attacks
    """
    if not filename:
        return "document.txt"
    
    # Remove path separators to prevent directory traversal
    sanitized = filename.replace('/', '_').replace('\\', '_').replace('..', '_')
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', ':', '"', '|', '?', '*', '\0']
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '_')
    
    # Limit length
    if len(sanitized) > max_length:
        # Preserve extension if present
        if '.' in sanitized:
            name, ext = sanitized.rsplit('.', 1)
            sanitized = name[:max_length - len(ext) - 1] + '.' + ext
        else:
            sanitized = sanitized[:max_length]
    
    return sanitized

def validate_file_size(file_size: int, max_size_mb: int = 10) -> bool:
    """
    STRIDE -- Denial of Service --> Validate file size to prevent resource exhaustion
    """
    max_size_bytes = max_size_mb * 1024 * 1024
    return file_size <= max_size_bytes

async def extract_text_from_file(file: UploadFile) -> str:
    """
    Helper to extract text from PDF or DOCX
    STRIDE -- Tampering --> Validate file type and sanitize extracted content
    """
    content = await file.read()
    
    # STRIDE -- Denial of Service --> Check file size
    if not validate_file_size(len(content), max_size_mb=10):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum allowed size (10MB)"
        )
    
    # STRIDE -- Tampering --> Sanitize filename
    safe_filename = sanitize_filename(file.filename)
    
    file_ext = safe_filename.lower().split('.')[-1]
    text = ""

    try:
        # STRIDE -- Elevation of Privilege --> Only allow specific file types
        allowed_extensions = ['pdf', 'docx', 'doc', 'txt']
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        if file_ext == 'pdf':
            pdf_reader = pypdf.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        elif file_ext in ['docx', 'doc']:
            doc = docx.Document(io.BytesIO(content))
            text = "\n".join([para.text for para in doc.paragraphs])
        elif file_ext == 'txt':
            text = content.decode('utf-8', errors='ignore')
        
        # STRIDE -- Information Disclosure --> Limit extracted text size
        if len(text) > 100000:
            text = text[:100000] + "\n...[Content truncated for security]"
            
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        print(f"Extraction Error: {e}")
        return f"[Error extracting text from file: {str(e)}]"
    
    return text

@app.post("/api/query", response_model=QueryResponse, dependencies=[Depends(verify_api_key)])
async def query_agent(
    query: str = Form(...),
    thread_id: Optional[str] = Form(None),
    verbose: bool = Form(False),
    mode: str = Form("general"),
    file: Optional[UploadFile] = File(None)
):
    service = get_rag_service()
    
    if not service.is_ready():
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        final_thread_id = thread_id or f"legal-session-{os.urandom(4).hex()}"
        
        # STRIDE -- Tampering --> Validate and sanitize query input
        if not query or len(query.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query cannot be empty"
            )
        
        # STRIDE -- Denial of Service --> Limit query length
        max_query_length = 5000
        if len(query) > max_query_length:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Query exceeds maximum length ({max_query_length} characters)"
            )
        
        # --- NEW: Handle File Extraction ---
        full_query = query
        if file:
            print(f"📂 Processing file: {file.filename}")
            # STRIDE -- Tampering --> Sanitize filename before logging
            safe_filename = sanitize_filename(file.filename)
            
            # STRIDE -- Repudiation --> Log file hash for audit trail
            file_content = await file.read()
            file_hash = hashlib.sha256(file_content).hexdigest()[:16]
            print(f"🔐 File Hash (for audit): {file_hash}")
            
            # Reset file pointer for extraction
            await file.seek(0)
            
            extracted_text = await extract_text_from_file(file)
            
            # STRIDE -- Information Disclosure --> Limit extracted text
            if len(extracted_text) > 100000:
                extracted_text = extracted_text[:100000] + "\n...[Truncated for security]"
            
            # Append context to query
            full_query = f"""
{query}

--- USER ATTACHED DOCUMENT ({safe_filename}) ---
{extracted_text}
"""
        
        result = service.query(
            query=full_query,
            thread_id=final_thread_id,
            verbose=verbose,
            mode=mode
        )
        
        raw_results = result.get("retrieved_results", [])
        unique_sources = []
        seen_sources = set()

        for r in raw_results:
            if isinstance(r, dict):
                raw_name = r.get('pdf_name', 'Unknown Document')
                doc_clean = raw_name.replace('_', ' ').replace('.pdf', '')

                raw_section = r.get('section_text', 'General')
                section_clean = raw_section.split('\n')[0]
                if len(section_clean) > 60:
                    section_clean = section_clean[:80] + "..."

                raw_chunk = r.get('chunk_text', 'No content')

                snippet = ' '.join(raw_chunk.split())
                if len(snippet) > 150:
                    snippet = snippet[:147] + "..."

                score = round(r.get('score', 0) * 100) 

                identifier = f"{doc_clean}|{section_clean}"
                
                if identifier not in seen_sources:
                    unique_sources.append({
                        "title": doc_clean,
                        "section": section_clean,
                        "data_point": snippet,   
                        "confidence": score,     
                        "type": r.get('source_db', 'Legal DB')
                    })
                    seen_sources.add(identifier)
        
        intent_label = "General Chat"
        if result.get("is_procedure"): 
            intent_label = "Guided Procedure"
        elif result.get("is_prediction"): 
            intent_label = "Outcome Prediction"
        elif result.get("is_legal_query"): 
            intent_label = "Legal Analysis"

        reasoning_from_service = result.get("reasoning", {})
        is_draft = reasoning_from_service.get("is_draft", False)
        file_b64 = reasoning_from_service.get("file_data")
        file_name = reasoning_from_service.get("filename")

        reasoning_data = {
            "intent": "Document Drafting" if is_draft else intent_label,
            "route": "Drafting Branch" if is_draft else "RAG Retrieval",
            "sub_queries": result.get("sub_queries", []),
            "sources": unique_sources[:5] if not is_draft else [],
            "doc_count": len(unique_sources)
        }

        return QueryResponse(
            answer=result.get("final_answer", ""),
            thread_id=final_thread_id,
            is_legal_query=result.get("is_legal_query", False),
            is_comparison=result.get("is_comparison", False),
            is_procedure=result.get("is_procedure", False),
            is_draft=is_draft,
            file_data=file_b64,
            filename=file_name,
            sub_queries=result.get("sub_queries", []),
            reasoning=reasoning_data 
        )
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        print(f"❌ Error processing query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/session/new", dependencies=[Depends(verify_api_key)])
async def create_new_session():
    thread_id = f"legal-session-{os.urandom(4).hex()}"
    return {"thread_id": thread_id, "message": "New session created"}

@app.get("/api/session/{thread_id}", response_model=SessionResponse, dependencies=[Depends(verify_api_key)])
async def get_session(thread_id: str):
    service = get_rag_service()
    try:
        # STRIDE -- Information Disclosure --> Validate thread_id format to prevent injection
        if not thread_id or len(thread_id) > 100 or not thread_id.replace('-', '').replace('_', '').isalnum():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid thread_id format"
            )
        
        history = service.get_conversation_history(thread_id)
        return SessionResponse(thread_id=thread_id, message="History retrieved", messages=history)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/session/{thread_id}", dependencies=[Depends(verify_api_key)])
async def clear_session(thread_id: str):
    service = get_rag_service()
    try:
        # STRIDE -- Information Disclosure --> Validate thread_id format
        if not thread_id or len(thread_id) > 100 or not thread_id.replace('-', '').replace('_', '').isalnum():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid thread_id format"
            )
        
        service.clear_conversation(thread_id)
        return {"thread_id": thread_id, "message": "Session cleared"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)