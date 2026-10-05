let owner: string | null = null;

export function acquireWebGL(requested: string): boolean {
  if (owner !== null && owner !== requested) return false;
  owner = requested;
  return true;
}

export function releaseWebGL(requested: string): void {
  if (owner === requested) owner = null;
}

export function webglOwner(): string | null {
  return owner;
}
