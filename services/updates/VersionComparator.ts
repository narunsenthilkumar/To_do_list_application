export interface ParsedSemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  raw: string;
}

export class VersionComparator {
  /**
   * Parses a version string into semantic version components.
   * Strips leading 'v' or 'V'.
   */
  static parse(versionStr: string): ParsedSemVer {
    if (!versionStr || typeof versionStr !== 'string') {
      return { major: 0, minor: 0, patch: 0, raw: '0.0.0' };
    }

    const clean = versionStr.trim().replace(/^v/i, '');
    const [mainPart, prerelease] = clean.split('-');
    const parts = mainPart.split('.').map((p) => {
      const num = parseInt(p, 10);
      return isNaN(num) ? 0 : num;
    });

    return {
      major: parts[0] ?? 0,
      minor: parts[1] ?? 0,
      patch: parts[2] ?? 0,
      prerelease,
      raw: clean,
    };
  }

  /**
   * Compares two semantic version strings.
   * Returns:
   *  -1 if v1 < v2 (v2 is newer)
   *   0 if v1 === v2
   *   1 if v1 > v2 (v1 is newer)
   */
  static compare(v1: string, v2: string): -1 | 0 | 1 {
    const p1 = this.parse(v1);
    const p2 = this.parse(v2);

    if (p1.major !== p2.major) {
      return p1.major < p2.major ? -1 : 1;
    }

    if (p1.minor !== p2.minor) {
      return p1.minor < p2.minor ? -1 : 1;
    }

    if (p1.patch !== p2.patch) {
      return p1.patch < p2.patch ? -1 : 1;
    }

    // Handle prereleases if identical major.minor.patch
    if (p1.prerelease && !p2.prerelease) {
      return -1; // 2.0.0-beta is older than 2.0.0
    }
    if (!p1.prerelease && p2.prerelease) {
      return 1; // 2.0.0 is newer than 2.0.0-beta
    }
    if (p1.prerelease && p2.prerelease) {
      return p1.prerelease.localeCompare(p2.prerelease) < 0 ? -1 : p1.prerelease.localeCompare(p2.prerelease) > 0 ? 1 : 0;
    }

    return 0;
  }

  /**
   * Returns true if targetVersion is strictly newer than currentVersion.
   */
  static isUpdateAvailable(currentVersion: string, targetVersion: string): boolean {
    return this.compare(currentVersion, targetVersion) === -1;
  }

  /**
   * Returns true if currentVersion is strictly below the minimumSupportedVersion.
   */
  static isBelowMinimum(currentVersion: string, minimumSupportedVersion?: string): boolean {
    if (!minimumSupportedVersion) return false;
    return this.compare(currentVersion, minimumSupportedVersion) === -1;
  }
}
