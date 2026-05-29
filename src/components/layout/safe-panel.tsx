"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SafePanel extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SafePanel] ${this.props.name} CRASHED:`, error.message, info.componentStack?.slice(0, 200));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50/30 p-4 text-xs">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" strokeWidth={1.5} />
            <span className="font-medium text-red-700">
              [{this.props.name}] This module could not be displayed, but other results remain available.
            </span>
          </div>
          <p className="text-red-500/70 text-[10px] ml-5">
            {this.state.error?.message ?? "Unknown render error"}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
