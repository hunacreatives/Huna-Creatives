import { Link } from 'react-router-dom';
import Navigation from '../components/feature/Navigation';
import Footer from './home/components/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] font-body flex flex-col">
      <Navigation />
      
      <main className="flex-1 flex items-center justify-center px-4 md:px-6 py-12 md:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-6 md:mb-8">
            <span className="text-6xl md:text-8xl lg:text-9xl font-bold gradient-text font-display">404</span>
          </div>
          
          <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">
            Page Not Found
          </h1>
          
          <p className="text-white/40 text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto leading-relaxed">
            Oops! The page you&apos;re looking for doesn&apos;t exist. It might have been moved or deleted.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-2.5 md:py-3 font-semibold rounded-full text-white text-sm whitespace-nowrap cursor-pointer hover:scale-105 transition-all duration-300 w-full sm:w-auto"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)',
              }}
            >
              <i className="ri-home-line text-base" />
              Go Home
            </Link>
            
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-2.5 md:py-3 rounded-full text-sm font-semibold border border-orange-400/50 text-orange-400 hover:bg-orange-500/10 transition-all duration-300 hover:scale-105 whitespace-nowrap cursor-pointer w-full sm:w-auto"
            >
              <i className="ri-mail-line text-base" />
              Contact Us
            </Link>
          </div>
        </div>
      </main>
      
      <Footer isDark />
    </div>
  );
}
