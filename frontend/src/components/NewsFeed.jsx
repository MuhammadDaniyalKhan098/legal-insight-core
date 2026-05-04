import { useState, useEffect } from "react";
import axios from "../config/axios";
import { ExternalLink, Clock, AlertCircle } from "lucide-react";

const NewsFeed = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // const { data } = await axios.get(
        //   `${import.meta.env.VITE_API_URL}/api/news`,
        // );
        const { data } = await axios.get("/api/news");

        // FIX: Changed article.urlToImage to article.image for GNews
        const validArticles = data.filter(
          (article) =>
            article.title && article.title !== "[Removed]" && article.image,
        );

        setNews(validArticles.slice(0, 9));
      } catch (err) {
        setError("Unable to load latest legal news at this time.");
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-12 p-6 bg-gray-800/50 border border-gray-700 rounded-2xl animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-1/4 mb-8"></div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 bg-gray-700/50 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-12 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
        <AlertCircle size={24} />
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  if (news.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto mt-16 mb-12 px-4 animate-fade-in anim-delay-500">
      <div className="flex items-center gap-3 mb-8">
        <h2 className="text-3xl font-bold text-white">Latest Legal News</h2>
        <span className="px-4 py-1.5 bg-blue-500/20 text-blue-400 text-sm font-semibold rounded-full border border-blue-500/30">
          Pakistan
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {news.map((article, index) => (
          <a
            key={index}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2"
          >
            {/* FIX: Changed article.urlToImage to article.image */}
            {article.image && (
              <div className="h-56 overflow-hidden flex-shrink-0">
                <img
                  src={article.image} // FIX: Changed here as well
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
            )}
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-white font-bold text-lg mb-3 line-clamp-3 group-hover:text-blue-400 transition-colors flex-grow">
                {article.title}
              </h3>
              <div className="flex items-center justify-between text-sm text-gray-400 mt-4 pt-4 border-t border-gray-700/50">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>
                    {/* GNews uses 'publishedAt' just like NewsAPI, so this stays exactly the same! */}
                    {new Date(article.publishedAt).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </span>
                </div>
                <ExternalLink
                  size={18}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400"
                />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
