import React from "react";
import PropTypes from "prop-types";

const Orbs = () => (
  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
    <div className="bg-orb-1 absolute -top-44 -left-44 w-[680px] h-[680px] rounded-full bg-blue-500/10 blur-3xl animate-soft-pulse" />
    <div className="bg-orb-2 absolute -bottom-56 -right-56 w-[780px] h-[780px] rounded-full bg-indigo-500/10 blur-3xl animate-soft-pulse anim-delay-200" />
    <div className="bg-orb-3 absolute top-[18%] left-1/2 -translate-x-1/2 w-[460px] h-[460px] rounded-full bg-violet-500/8 blur-3xl animate-soft-pulse anim-delay-400" />
  </div>
);

/**
 * Page wrapper for consistent dark theme + ambient motion.
 *
 * - Adds subtle grid + vignette + floating orbs.
 * - Provides a responsive container for page contents.
 */
export default function Page({
  children,
  containerClassName = "",
  withOrbs = true,
}) {
  return (
    <div className="ui-page">
      {/* Subtle grid + vignette + grain */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.22]">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.10)_1px,transparent_1px)] bg-[size:44px_44px]" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,rgba(59,130,246,0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_50%_100%,rgba(168,85,247,0.11),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22 viewBox=%220 0 120 120%22%3E%3Cfilter id=%22n%22 x=%220%22 y=%220%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.55%22/%3E%3C/svg%3E')]" />
      </div>

      {withOrbs && <Orbs />}

      <div className={`ui-container ${containerClassName}`}>
        {children}
      </div>
    </div>
  );
}

Page.propTypes = {
  children: PropTypes.node.isRequired,
  containerClassName: PropTypes.string,
  withOrbs: PropTypes.bool,
};

