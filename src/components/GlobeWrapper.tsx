"use client";

import { forwardRef, useRef } from "react";
import type { MutableRefObject } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods, GlobeProps } from "react-globe.gl";

export type GlobeWrapperProps = GlobeProps & {
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  /** next/dynamic 不会转发 ref，用普通属性把同一个 ref 挂到 Globe 上 */
  globeRef?: MutableRefObject<GlobeMethods | undefined>;
};

const GlobeWrapper = forwardRef<GlobeMethods | undefined, GlobeWrapperProps>(
  function GlobeWrapper(
    {
      autoRotate = true,
      autoRotateSpeed = 0.5,
      globeRef,
      onGlobeReady,
      ...props
    },
    ref,
  ) {
    const localRef = useRef<GlobeMethods | undefined>(undefined);
    const globeInstanceRef = globeRef ?? localRef;

    function syncRef(instance: GlobeMethods | undefined) {
      globeInstanceRef.current = instance;
      if (typeof ref === "function") {
        ref(instance);
      } else if (ref) {
        ref.current = instance;
      }
    }

    function handleReady() {
      window.setTimeout(() => {
        syncRef(globeInstanceRef.current);
        const controls = globeInstanceRef.current?.controls();
        if (controls) {
          controls.autoRotate = autoRotate;
          controls.autoRotateSpeed = autoRotateSpeed;
        }
        onGlobeReady?.();
      }, 0);
    }

    return (
      <Globe
        {...props}
        ref={globeInstanceRef}
        onGlobeReady={handleReady}
      />
    );
  },
);

export default GlobeWrapper;
