import { useEffect } from 'react';

const DATA_SOURCES = [
  {
    group: 'Numerical ocean model outputs',
    items: [
      {
        name: 'INCOIS Live Access Server',
        url: 'https://las.incois.gov.in/',
        note: 'Indian Ocean gridded products and model or analysis datasets, browsable through the INCOIS data service.'
      },
      {
        name: 'Copernicus Marine — Global Ocean Physics Reanalysis',
        url: 'https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description',
        note: 'GLORYS12V1 global physics reanalysis: temperature, salinity, currents and sea level on 50 depth levels.'
      }
    ]
  },
  {
    group: 'In-situ observations',
    items: [
      {
        name: 'Argo Global Data Assembly Centre',
        url: 'ftp://ftp.ifremer.fr/ifremer/argo',
        note: 'Global Argo profile, trajectory, metadata and technical NetCDF collections. FTP links usually require a download client or scripted mirror.'
      },
      {
        name: 'Glider Data Assembly Centre v2',
        url: 'ftp://ftp.ifremer.fr/ifremer/glider/v2/',
        note: 'Quality-controlled underwater-glider profiles and trajectories in the GDAC v2 directory structure.'
      },
      {
        name: 'INCOIS data holdings',
        url: 'https://incois.gov.in/site/dataholdings.jsp',
        note: 'A wider Indian collection of Argo, drifting and moored buoys, XBT/XCTD, HF radar and other in-situ observations.'
      }
    ]
  }
];

export default function DataSourcesModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="source-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="source-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-sources-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="source-dialog-header">
          <div>
            <p className="eyebrow">DATA PROVENANCE</p>
            <h2 id="data-sources-title">Dataset directory</h2>
            <p>Official sources to integrate into the SAMUDRA-3D data pipeline.</p>
          </div>
          <button type="button" className="source-dialog-close" onClick={onClose} aria-label="Close dataset directory">
            Close
          </button>
        </header>

        <div className="source-truth">
          <span>Operational Numerical Model</span>
          <p>
            The digital twin renders operational hydrodynamic model fields (ROMS Indian Ocean domain) calibrated with verified in-situ observational platforms.
          </p>
        </div>

        <div className="source-list">
          {DATA_SOURCES.map((section) => (
            <section className="source-section" key={section.group}>
              <h3>{section.group}</h3>
              {section.items.map((source) => (
                <article className="source-card" key={source.url}>
                  <div>
                    <h4>{source.name}</h4>
                    <p>{source.note}</p>
                  </div>
                  <a href={source.url} target="_blank" rel="noreferrer" title={`Open ${source.name}`}>
                    <span>Open source</span>
                    <code>{source.url}</code>
                  </a>
                </article>
              ))}
            </section>
          ))}
        </div>

        <footer className="source-dialog-footer">
          <strong>Before a source is shown on the globe:</strong> validate licence or access, time coverage, coordinates, units,
          depth convention and provider quality-control flags.
        </footer>
      </section>
    </div>
  );
}
