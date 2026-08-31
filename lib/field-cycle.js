export const fieldCycleDecision = (currentId, completedMatches, orderedIds, threshold = 3) => {
  if (completedMatches < threshold) return { fieldId: currentId, wins: completedMatches, rotated: false };
  const currentIndex = Math.max(0, orderedIds.indexOf(currentId));
  return {
    fieldId: orderedIds[(currentIndex + 1) % orderedIds.length],
    wins: 0,
    rotated: true,
  };
};
