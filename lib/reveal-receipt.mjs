// Receipts apply only to the exact participant/token and draw round that saved.
// An older poll cannot undo a confirmed reveal; a redraw/reset cannot reuse it.
export function confirmedReveal(receipt, state, token) {
  return !!(receipt && state?.me && receipt.token === token && receipt.group_id === state.group.id &&
    receipt.round === state.group.round && receipt.member_id === state.me.id &&
    receipt.receiver?.id === state.me.receiver_id && receipt.drawn === true);
}
