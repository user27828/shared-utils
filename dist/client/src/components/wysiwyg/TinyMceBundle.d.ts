import React from 'react';

export interface TinyMceBundleProps {
  /**
   * URL to load TinyMCE from
   */
  scriptSrc?: string;
  /**
   * Children to render
   */
  children: React.ReactNode;
}

export function TinyMceBundle(props: TinyMceBundleProps): JSX.Element;