"use client";

import * as React from "react";

export interface ReportRenderContextValue {
  exporting: boolean;
}

const defaultValue: ReportRenderContextValue = { exporting: false };

export const ReportRenderContext =
  React.createContext<ReportRenderContextValue>(defaultValue);

export function useReportRender(): ReportRenderContextValue {
  return React.useContext(ReportRenderContext);
}
