import unveilIdentityPackage from '@unveil/identity/package.json'

const repoName = 'unveil-project/identity'
const version = unveilIdentityPackage.version

export function useDetectionEngine() {
  return {
    name: repoName,
    version,
    label: `v${version}`,
    isPrerelease: version.includes('-'),
    npmUrl: `https://github.com/${repoName}`,
  }
}
