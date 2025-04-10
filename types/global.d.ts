// Global type declarations
import { NextComponentType, NextPageContext } from "next";
import { ReactElement, ReactNode } from "react";
import { AppInitialProps } from "next/app";

declare global {
  interface Window {
    __financeTranslations?: { [key: string]: string };
  }
}

export interface LayoutProps {
  children: ReactNode;
}

export type NextPageWithLayout<P = {}, IP = P> = NextComponentType<
  NextPageContext,
  IP,
  P
> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

export type AppPropsWithLayout = AppInitialProps & {
  Component: NextPageWithLayout;
}; 