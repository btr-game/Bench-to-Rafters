// A part of the page that fails to draw never takes the page with it (owner, after round 40: "the
// screen just randomly stopped. nothing shows up ... no keyboard shortcuts work"). React drops the
// whole page when one part throws while drawing, and a saved career that throws drops it again on
// every reload. Each guard keeps its own part: a card shows a short note in its place, a tab shows
// a way back to Home, the career a way back to the start, and the pieces drawn over the page (Guide
// mode, the lessons, the toasts) simply step aside. The note names the error, so it can be reported.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useStore } from '../../store';
import { t } from '../../i18n';

type Kind = 'card' | 'tab' | 'page' | 'quiet';

interface Props {
  /** Which part this is, for the console. */
  name: string;
  kind: Kind;
  /** The guard tries again when this changes (a new choice, another tab). */
  again?: unknown;
  /** A way past the part that failed (a story page: skip it). */
  skip?: () => void;
  /** Drawn over the page, like the part it stands in for. */
  float?: boolean;
  children: ReactNode;
}

interface State {
  error: Error | null;
  at: unknown;
}

const home = () => useStore.setState({ tab: 'home' });
const toStart = () => useStore.setState({ game: null, slot: null, tab: 'home', transition: null, lookBack: false, page: null, mini: null });

export class Safe extends Component<Props, State> {
  state: State = { error: null, at: undefined };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(p: Props, s: State): Partial<State> | null {
    // a new choice or another tab: draw it again
    if (s.error && p.again !== s.at) return { error: null, at: p.again };
    if (p.again !== s.at) return { at: p.again };
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.name}] could not be drawn:`, error, info.componentStack);
  }

  render(): ReactNode {
    const e = this.state.error;
    if (!e) return this.props.children;
    const { kind } = this.props;
    if (kind === 'quiet') return null;
    const what = `${this.props.name}: ${e.message || String(e)}`;
    if (kind === 'card')
      return (
        <section className="card stack safe-note" role="status">
          <p className="small">{t('This card could not be drawn. The rest of the career carries on.')}</p>
          <code className="small muted">{what}</code>
        </section>
      );
    return (
      <section className={`card stack safe-note safe-big${this.props.float ? ' safe-float' : ''}`} role="alert">
        <h2 className="title">{t('Something went wrong on this screen')}</h2>
        <p>{t('Your career is saved. Go back and carry on; if it happens again, send this line with your feedback:')}</p>
        <code className="small">{what}</code>
        <div className="row">
          {this.props.skip && (
            <button className="btn primary" onClick={this.props.skip}>
              {t('Skip this page')}
            </button>
          )}
          {useStore.getState().undo && (
            <button className="btn" onClick={() => useStore.getState().undoLast()}>
              {t('Undo (U)')}
            </button>
          )}
          {kind === 'tab' && (
            <button className="btn primary" onClick={home}>
              {t('Home')}
            </button>
          )}
          <button className={`btn${kind === 'page' && !this.props.skip ? ' primary' : ''}`} onClick={toStart}>
            {t('Back to the start')}
          </button>
        </div>
      </section>
    );
  }
}
