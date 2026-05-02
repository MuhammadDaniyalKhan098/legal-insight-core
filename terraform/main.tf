# ==========================================
# FYP Deployment: AWS Infrastructure Logic
# ==========================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # Lock version to prevent breaking changes
    }
  }
}

# The provider automatically uses the credentials set via `aws configure`
provider "aws" {
  region = var.aws_region
}

# 1. THE FIREWALL (Security Group)
resource "aws_security_group" "legal_insight_sg" {
  name        = "legal_insight_security_group"
  description = "Allow inbound traffic for Legal Insight services"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. THE SERVER (EC2 Instance)
resource "aws_instance" "legal_insight_server" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.legal_insight_sg.id]
  key_name               = var.key_pair_name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "LegalInsight-Production-Node"
  }
}

# 3. THE OUTPUT
output "server_public_ip" {
  value       = aws_instance.legal_insight_server.public_ip
  description = "The public IP address of the EC2 instance"
}