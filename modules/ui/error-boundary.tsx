import { t } from '../../lib/language';
import { Component, type ReactNode } from 'react';

// Last-resort fallback for the top-level game view. Catches render failures
// that would otherwise leave a blank page; retry clears a transient error,
// reload recovers from poisoned module state.
export class GameErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.warn('[bentengan] render gagal', error);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="renderer-error" role="alert">
          <strong>{t("GAME GAGAL DIMUAT")}</strong>
          <p>{t(error.message || 'Terjadi kesalahan saat menampilkan game.')}</p>
          <button type="button" onClick={() => this.setState({ error: null })}>
            {t("COBA LAGI")}
          </button>
          <button type="button" onClick={() => window.location.reload()}>
            {t("MUAT ULANG")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
