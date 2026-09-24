"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback: ReactNode;
};

type State = {
  hasError: boolean;
};

/** 包裹 ParticleStory，运行时错误时回退到静态首页 */
export default class ParticleStoryErrorBoundary extends Component<
  Props,
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ParticleStory]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
