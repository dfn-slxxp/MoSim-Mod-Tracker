// ---------------------------------------------------------------------------
// Public modpack showcase page (/packs/:slug) — a media carousel, a
// description, and a download button. Reached from /packs or a shared
// /pack/:slug link (server-rendered Open Graph embed). No auth required.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isTauri, getServerUrl } from '../lib/desktop';
import type { PublicPack } from '../types';

const MOSIM_URL = 'https://mosimulator.com/modding';

function Carousel({ media }: { media: PublicPack['media'] }) {
  const [index, setIndex] = useState(0);
  if (media.length === 0) return null;
  const item = media[index];

  return (
    <div className="pack-carousel">
      <div className="pack-carousel-stage">
        {item.type === 'video' ? (
          <video key={item.id} src={item.url} controls playsInline />
        ) : (
          <img key={item.id} src={item.url} alt="" />
        )}
        {media.length > 1 && (
          <>
            <button
              type="button"
              className="pack-carousel-nav prev"
              aria-label="Previous"
              onClick={() => setIndex((i) => (i - 1 + media.length) % media.length)}
            >
              ‹
            </button>
            <button
              type="button"
              className="pack-carousel-nav next"
              aria-label="Next"
              onClick={() => setIndex((i) => (i + 1) % media.length)}
            >
              ›
            </button>
          </>
        )}
      </div>
      {media.length > 1 && (
        <div className="pack-carousel-dots">
          {media.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className={`pack-carousel-dot ${i === index ? 'on' : ''}`}
              aria-label={`Show item ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PackPage() {
  const { slug } = useParams<{ slug: string }>();
  const [pack, setPack] = useState<PublicPack | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = isTauri() ? await getServerUrl() : '';
        const res = await fetch(`${base}/api/packs/${encodeURIComponent(slug ?? '')}`);
        if (cancelled) return;
        if (!res.ok) { setState('notfound'); return; }
        setPack((await res.json()) as PublicPack);
        setState('ok');
      } catch {
        if (!cancelled) setState('notfound');
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (state === 'loading') return <div className="loading">Loading…</div>;

  if (state === 'notfound' || !pack) {
    return (
      <div className="page">
        <Link className="btn subtle" to="/packs">← Back to modpacks</Link>
        <div className="empty">This modpack page doesn't exist, or isn't public.</div>
      </div>
    );
  }

  return (
    <div className="page pack-page">
      <div className="page-actions">
        <Link className="btn subtle" to="/packs">← Back to modpacks</Link>
      </div>

      <div className="pack-page-head">
        <span className="game-chip">{pack.game}</span>
        <h1>{pack.name}</h1>
        <span className="muted small">by {pack.authors.map((a) => a.displayName).join(', ')}</span>
      </div>

      <Carousel media={pack.media} />

      {pack.description && (
        <div className="pack-page-desc">
          {pack.description.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}

      <a className="btn primary pack-page-download" href={MOSIM_URL} target="_blank" rel="noreferrer">
        Download on MoSim's website →
      </a>
    </div>
  );
}
