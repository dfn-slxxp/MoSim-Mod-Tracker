// ---------------------------------------------------------------------------
// Public modpack showcase listing (/packs). Every modpack with a published
// page (hasPage + not private), across every user. No auth required to view.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isTauri, getServerUrl } from '../lib/desktop';
import type { PublicPack } from '../types';

const MOSIM_URL = 'https://mosimulator.com/modding';

function PackCard({ p }: { p: PublicPack }) {
  const cover = p.media.find((m) => m.type === 'image') ?? p.media[0];
  return (
    <Link className="pack-card" to={`/packs/${p.slug}`}>
      <div className="pack-card-media">
        {cover ? (
          cover.type === 'video' ? (
            <video src={cover.url} muted playsInline />
          ) : (
            <img src={cover.url} alt="" />
          )
        ) : (
          <div className="pack-card-media placeholder" />
        )}
      </div>
      <div className="pack-card-body">
        <span className="game-chip">{p.game}</span>
        <h3 className="pack-card-title">{p.name}</h3>
        {p.description && <p className="pack-card-desc">{p.description}</p>}
        <span className="muted small">by {p.authors.map((a) => a.displayName).join(', ')}</span>
      </div>
    </Link>
  );
}

export function PacksPage() {
  const [packs, setPacks] = useState<PublicPack[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const base = isTauri() ? await getServerUrl() : '';
        const res = await fetch(`${base}/api/packs`);
        if (!res.ok) return;
        const body = (await res.json()) as { packs: PublicPack[] };
        setPacks(body.packs ?? []);
      } catch {
        setPacks([]);
      }
    })();
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Modpacks</h1>
        <p className="muted">Showcase pages for modpacks people are shipping for MoSim.</p>
      </div>

      {packs === null ? (
        <div className="loading">Loading modpacks…</div>
      ) : packs.length === 0 ? (
        <div className="empty">No showcase pages yet.</div>
      ) : (
        <div className="pack-grid">
          {packs.map((p) => (
            <PackCard key={p.id} p={p} />
          ))}
        </div>
      )}

      <div className="pack-cta">
        <a className="btn primary" href={MOSIM_URL} target="_blank" rel="noreferrer">
          View modpacks by other people on MoSim's website →
        </a>
      </div>
    </div>
  );
}
