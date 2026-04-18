type WsConfig = {
  host: string;
  port?: number | string;
  path?: string;
  isSecure?: boolean;
};

export const createWsUrl = (config: WsConfig): string => {
  const { host, port, path = '', isSecure = true } = config;
  const protocol = isSecure ? 'wss' : 'ws';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const portSuffix = port ? `:${port}` : '';
  const cleanHost = host.replace(/\/+$/, '');
  return `${protocol}://${cleanHost}${portSuffix}${cleanPath}`;
};
