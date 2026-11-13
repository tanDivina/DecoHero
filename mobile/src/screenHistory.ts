/** Browser back/forward for the in-app screens. Web only (screenHistory.web.ts); the phone uses BackHandler. */
export function useScreenHistory<S extends string>(_screen: S, _onPop: (screen: S, cameFrom: S) => void): void {}
