import { Component, type ErrorInfo, type ReactNode } from "react";
import { Brand } from "./brand";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center px-6">
          <div className="card w-full max-w-md p-8 text-center">
            <Brand className="justify-center" />
            <h1 className="mt-8 font-display text-2xl font-semibold text-espresso-900">
              Something spilled.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-espresso-500">
              The page hit an unexpected error. Reloading usually fixes it.
            </p>
            <button
              type="button"
              className="btn-primary mt-6"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
