import unveilIdentityPackage from '@unveil/identity/package.json'

const version = unveilIdentityPackage.version

export function useDetectionEngine() {
  return {
    name: 'identity',
    version,
    label: `v${version}`,
    isPrerelease: version.includes('-'),
    npmUrl: 'https://github.com/unveil-project/identity',
  }
}
