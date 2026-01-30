import { ArrowRight, Zap, Eye, TrendingUp, Sparkles, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PageId } from './InfoButton';

interface PageSection {
  icon: LucideIcon;
  title: string;
  content?: string;
  items?: string[];
  links?: Array<{ label: string; path: string }>;
}

interface PageInfo {
  title: string;
  tagline: string;
  sections: PageSection[];
}

const PAGE_INFO: Record<PageId, PageInfo> = {
  gallery: {
    title: "Gallery",
    tagline: "4,200 Wojak Farmer Plot NFTs",
    sections: [
      {
        icon: Eye,
        title: "How to Explore",
        content: "Click any base character to see all variations. Use sidebar filters to narrow by traits, price, or rarity."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Sort by 'Recently Listed' to catch new deals",
          "Click any trait to filter the entire collection",
          "Rarity rank is shown on each NFT detail view"
        ]
      },
      {
        icon: TrendingUp,
        title: "Go Deeper",
        links: [
          { label: "Analyze traits with BigPulp", path: "/bigpulp" },
          { label: "Create your own in Generator", path: "/generator" }
        ]
      }
    ]
  },
  bigpulp: {
    title: "BigPulp Intelligence",
    tagline: "BigPulp sees what you cannot.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Market data, trait analysis, and an AI that knows everything about the collection."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Heat Map shows price vs rarity \u2014 find undervalued gems",
          "Ask BigPulp about specific combos: 'What's a Ronin Wojak worth?'",
          "Check 'Top 10 Valuable Attributes' for high-value traits"
        ]
      },
      {
        icon: Sparkles,
        title: "Try Asking",
        items: [
          "What's trending today?",
          "Find me undervalued NFTs",
          "Which traits are pumping?"
        ]
      }
    ]
  },
  generator: {
    title: "Wojak Generator",
    tagline: "Experience being the artist.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Build your own Wojak using the same traits from the collection. Feel what the artist felt."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Orange badges on traits indicate premium/rare options",
          "Hit 'Random' for quick inspiration",
          "Export and share your creation on social"
        ]
      }
    ]
  },
  games: {
    title: "Games",
    tagline: "Training simulations active.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Arcade games to play and compete. Earn points for the leaderboard."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Points contribute to your overall rank",
          "Check 'Your High Scores' to track progress",
          "Some games have daily challenges"
        ]
      }
    ]
  },
  leaderboard: {
    title: "Leaderboard",
    tagline: "Top operators in the simulation.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Rankings based on game scores. Filter by time period to see who's on top."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Weekly resets give everyone a fresh shot",
          "Different games have different point weights",
          "Top 3 get special recognition"
        ]
      }
    ]
  },
  chat: {
    title: "Chat Rooms",
    tagline: "Connect with operators.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Whale Chat (42+ NFTs) and Holder Chat (1+ NFT). Gated by your holdings."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Whale Chat is where the big moves are discussed",
          "Holder Chat is open to all collection members"
        ]
      }
    ]
  },
  account: {
    title: "Your Profile",
    tagline: "Your identity in the simulation.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Your Wojaks, game scores, achievements, and friends."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Customize your avatar from your NFT collection",
          "Achievements unlock through gameplay and exploration",
          "Your profile card can be shared"
        ]
      }
    ]
  },
  shop: {
    title: "Shop",
    tagline: "Gear up.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Items and power-ups. Spend your earned currency."
      }
    ]
  },
  treasury: {
    title: "Treasury",
    tagline: "Community funds.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Track the community treasury holdings. Funds from sales and royalties."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Bubble size shows relative holdings",
          "Treasury funds development and community rewards"
        ]
      }
    ]
  }
};

export function PageInfoContent({ page }: { page: PageId }) {
  const info = PAGE_INFO[page];

  return (
    <div className="page-info-content">
      <header className="info-header">
        <h2>{info.title}</h2>
        <p className="info-tagline">{info.tagline}</p>
      </header>

      <div className="info-sections">
        {info.sections.map((section, i) => (
          <div key={i} className="info-section">
            <div className="section-icon">
              <section.icon size={20} />
            </div>
            <div className="section-content">
              <h3>{section.title}</h3>
              {section.content && <p>{section.content}</p>}
              {section.items && (
                <ul>
                  {section.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
              {section.links && (
                <div className="section-links">
                  {section.links.map((link, j) => (
                    <Link key={j} to={link.path} className="info-link">
                      {link.label}
                      <ArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
