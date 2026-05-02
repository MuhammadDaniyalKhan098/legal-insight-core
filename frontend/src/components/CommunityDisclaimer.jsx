/**
 * CommunityDisclaimer Component
 * 
 * Displays the mandatory disclaimer on all community pages.
 * 
 * @module components/CommunityDisclaimer
 */

const CommunityDisclaimer = () => {
  return (
    <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl p-4 mb-6 flex items-start gap-3">
      <span className="text-amber-400 text-lg flex-shrink-0 mt-0.5">⚠️</span>
      <p className="text-amber-200/80 text-sm leading-relaxed">
        <strong className="text-amber-300 font-semibold">Disclaimer:</strong>{" "}
        Community responses are for informational purposes only and do not constitute legal advice. Always consult a qualified legal professional.
      </p>
    </div>
  );
};

export default CommunityDisclaimer;
