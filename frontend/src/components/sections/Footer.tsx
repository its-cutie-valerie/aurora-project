import React from 'react';
import { Github, ExternalLink, Database, NotepadText, Globe } from 'lucide-react';
import './Footer.css';
import codedexLogo from "../../assets/valentinesbot.webp";

export const Footer: React.FC = () => {
    const dataSources = [
        { name: 'SILSO / WDC-SILSO', desc: 'International Sunspot Number', url: 'https://www.sidc.be/SILSO/home' },
        { name: 'NASA DONKI', desc: 'Space Weather Database', url: 'https://ccmc.gsfc.nasa.gov/donki/' },
        { name: 'GFZ Potsdam', desc: 'Kp Index & Geomagnetic Data', url: 'https://kp.gfz-potsdam.de/en/' },
        { name: 'NOAA SWPC', desc: 'Space Weather Prediction Center', url: 'https://www.swpc.noaa.gov' },
        { name: 'ESA Space Weather', desc: 'European Space Agency', url: 'https://www.esa-sw.org/' },
        { name: 'STEREO / SOHO', desc: 'Solar Observatory Missions', url: 'https://soho.nascom.nasa.gov/data/' },
        { name: 'USGS Geomagnetism', desc: 'Geomagnetic Field Models', url: 'https://www.usgs.gov/programs/geomagnetism' },
        { name: 'NAS / Baker et al.', desc: 'Severe Space Weather Reports', url: 'https://www.nap.edu/catalog/12507/severe-space-weather-events-understanding-societal-and-economic-impacts-a' },
    ];

    return (
        <footer className="footer">
            <div className="container footer__inner">
                {/* Column 1: Project */}
                <div className="footer__project">
                    <div className="footer__logo">
                        <span>The Sun&apos;s Temper</span>
                    </div>
                    <p className="footer__tagline">
                        A visual data science exploration of solar activity, space weather,
                        and its impact on modern civilization.
                    </p>
                    <div className="footer__tech-stack">
                        <span className="footer__tech-tag mono">React</span>
                        <span className="footer__tech-tag mono">D3.js</span>
                        <span className="footer__tech-tag mono">Three.js</span>
                        <span className="footer__tech-tag mono">Framer Motion</span>
                    </div>
                </div>

                {/* Column 2: Data Sources */}
                <div className="footer__sources">
                    <div className="footer__col-header">
                        <Database size={16} />
                        <span className="mono">DATA SOURCES</span>
                    </div>
                    <div className="footer__source-list">
                        {dataSources.map((source) => (
                            <a
                                key={source.name}
                                href={source.url}
                                className="footer__source-item"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span className="footer__source-name">{source.name}</span>
                                <span className="footer__source-desc">{source.desc}</span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Column 3: Links & Meta */}
                <div className="footer__links">
                    <div className="footer__col-header">
                        <Globe size={16} />
                        <span className="mono">LINKS</span>
                    </div>
                    <div className="footer__link-list">
                        <a href="#" className="footer__link" aria-label="View on GitHub">
                            <Github size={16} />
                            <span>Source Code</span>
                            <ExternalLink size={12} />
                        </a>
                        {/* <a href="#" className="footer__link" aria-label="Blog Post">
                            <NotepadText size={16} />
                            <span>Blog Post</span>
                            <ExternalLink size={12} />
                        </a> */}
                        <a href="#" className="footer__link" aria-label="Codédex Submission">
                            <img src={codedexLogo} alt="Codédex" />
                            <span>Codédex Submission</span>
                            <ExternalLink size={12} />
                        </a>
                    </div>
                    <div className="footer__built-info">
                        <span className="mono">Built for the Data Science February 2026 Challenge.</span>
                    </div>
                </div>
            </div>

            <div className="footer__bottom container">
                <span className="mono">
                    &copy; {new Date().getFullYear()} The Sun&apos;s Temper Project
                </span>
                <span className="footer__bottom-disclaimer mono">
                    Data is for educational purposes. Not an official NOAA product.
                </span>
            </div>
        </footer>
    );
};
