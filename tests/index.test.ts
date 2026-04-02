import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync, execFileSync } from 'node:child_process';
import {
  getGroupedChanges,
  getStagedAnalysisHandler,
  executeCommit
} from '../src/index.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  execFileSync: vi.fn()
}));

const mockExecSync = vi.mocked(execSync);
const mockExecFileSync = vi.mocked(execFileSync);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getGroupedChanges', () => {
  // ── Error / empty paths ────────────────────────────────────────────────────

  it('returns error object when execSync throws', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('git not found');
    });
    const result = getGroupedChanges();
    expect(result).toEqual({ error: 'Error: git not found' });
  });

  it('returns no-changes message when git status output is empty', () => {
    mockExecSync.mockReturnValue('');
    const result = getGroupedChanges();
    expect(result).toEqual({ message: 'No uncommitted changes found.' });
  });

  // ── Type detection: test ───────────────────────────────────────────────────

  it('classifies file with "test" in path as type test', () => {
    mockExecSync.mockReturnValue('M  src/test/utils.ts');
    expect(getGroupedChanges()).toEqual({ 'test(src)': ['src/test/utils.ts'] });
  });

  it('classifies file with "spec" in path as type test', () => {
    mockExecSync.mockReturnValue('M  src/spec/utils.ts');
    expect(getGroupedChanges()).toEqual({ 'test(src)': ['src/spec/utils.ts'] });
  });

  it('classifies file with "__tests__" in path as type test', () => {
    mockExecSync.mockReturnValue('M  src/__tests__/utils.ts');
    expect(getGroupedChanges()).toEqual({
      'test(src)': ['src/__tests__/utils.ts']
    });
  });

  it('classifies file with "tests/" segment in path as type test', () => {
    mockExecSync.mockReturnValue('M  tests/helpers.ts');
    expect(getGroupedChanges()).toEqual({
      'test(tests)': ['tests/helpers.ts']
    });
  });

  it('classifies file matching .test.<ext> filename pattern as type test', () => {
    mockExecSync.mockReturnValue('M  src/utils.test.ts');
    expect(getGroupedChanges()).toEqual({ 'test(src)': ['src/utils.test.ts'] });
  });

  it('classifies file matching .spec.<ext> filename pattern as type test', () => {
    mockExecSync.mockReturnValue('M  src/utils.spec.ts');
    expect(getGroupedChanges()).toEqual({ 'test(src)': ['src/utils.spec.ts'] });
  });

  // ── Type detection: docs ───────────────────────────────────────────────────

  it('classifies .md file as type docs', () => {
    mockExecSync.mockReturnValue('M  README.md');
    expect(getGroupedChanges()).toEqual({ 'docs(root)': ['README.md'] });
  });

  it('classifies .mdx file as type docs', () => {
    mockExecSync.mockReturnValue('M  docs/guide.mdx');
    expect(getGroupedChanges()).toEqual({ 'docs(docs)': ['docs/guide.mdx'] });
  });

  it('classifies .txt file as type docs', () => {
    mockExecSync.mockReturnValue('M  notes.txt');
    expect(getGroupedChanges()).toEqual({ 'docs(root)': ['notes.txt'] });
  });

  it('classifies .rst file as type docs', () => {
    mockExecSync.mockReturnValue('M  docs/guide.rst');
    expect(getGroupedChanges()).toEqual({ 'docs(docs)': ['docs/guide.rst'] });
  });

  it('classifies README file without extension as type docs', () => {
    mockExecSync.mockReturnValue('M  README');
    expect(getGroupedChanges()).toEqual({ 'docs(root)': ['README'] });
  });

  it('classifies CHANGELOG file as type docs', () => {
    mockExecSync.mockReturnValue('M  CHANGELOG');
    expect(getGroupedChanges()).toEqual({ 'docs(root)': ['CHANGELOG'] });
  });

  it('classifies file under docs/ path as type docs', () => {
    mockExecSync.mockReturnValue('M  docs/setup.ts');
    expect(getGroupedChanges()).toEqual({ 'docs(docs)': ['docs/setup.ts'] });
  });

  // ── Type detection: style ──────────────────────────────────────────────────

  it('classifies .css file as type style', () => {
    mockExecSync.mockReturnValue('M  src/app.css');
    expect(getGroupedChanges()).toEqual({ 'style(src)': ['src/app.css'] });
  });

  it('classifies .scss file as type style', () => {
    mockExecSync.mockReturnValue('M  src/app.scss');
    expect(getGroupedChanges()).toEqual({ 'style(src)': ['src/app.scss'] });
  });

  it('classifies .sass file as type style', () => {
    mockExecSync.mockReturnValue('M  src/app.sass');
    expect(getGroupedChanges()).toEqual({ 'style(src)': ['src/app.sass'] });
  });

  it('classifies .less file as type style', () => {
    mockExecSync.mockReturnValue('M  src/app.less');
    expect(getGroupedChanges()).toEqual({ 'style(src)': ['src/app.less'] });
  });

  it('classifies file with .styled. in name as type style', () => {
    mockExecSync.mockReturnValue('M  src/Button.styled.ts');
    expect(getGroupedChanges()).toEqual({
      'style(src)': ['src/Button.styled.ts']
    });
  });

  // ── Type detection: ci ────────────────────────────────────────────────────

  it('classifies file under .github/workflows as type ci', () => {
    mockExecSync.mockReturnValue('M  .github/workflows/ci.yml');
    expect(getGroupedChanges()).toEqual({
      'ci(.github)': ['.github/workflows/ci.yml']
    });
  });

  it('classifies file under .github/actions as type ci', () => {
    mockExecSync.mockReturnValue('M  .github/actions/build/action.yml');
    expect(getGroupedChanges()).toEqual({
      'ci(.github)': ['.github/actions/build/action.yml']
    });
  });

  it('classifies file under .circleci as type ci', () => {
    mockExecSync.mockReturnValue('M  .circleci/config.yml');
    expect(getGroupedChanges()).toEqual({
      'ci(.circleci)': ['.circleci/config.yml']
    });
  });

  it('classifies Jenkinsfile by exact name as type ci', () => {
    mockExecSync.mockReturnValue('M  Jenkinsfile');
    expect(getGroupedChanges()).toEqual({ 'ci(root)': ['Jenkinsfile'] });
  });

  it('classifies .travis.yml by exact name as type ci', () => {
    mockExecSync.mockReturnValue('M  .travis.yml');
    expect(getGroupedChanges()).toEqual({ 'ci(root)': ['.travis.yml'] });
  });

  it('classifies .gitlab-ci.yml by exact name as type ci', () => {
    mockExecSync.mockReturnValue('M  .gitlab-ci.yml');
    expect(getGroupedChanges()).toEqual({ 'ci(root)': ['.gitlab-ci.yml'] });
  });

  // ── Type detection: build ─────────────────────────────────────────────────

  it('classifies Dockerfile by exact name as type build', () => {
    mockExecSync.mockReturnValue('M  Dockerfile');
    expect(getGroupedChanges()).toEqual({ 'build(root)': ['Dockerfile'] });
  });

  it('classifies package.json as type build', () => {
    mockExecSync.mockReturnValue('M  package.json');
    expect(getGroupedChanges()).toEqual({ 'build(root)': ['package.json'] });
  });

  it('classifies Makefile as type build', () => {
    mockExecSync.mockReturnValue('M  Makefile');
    expect(getGroupedChanges()).toEqual({ 'build(root)': ['Makefile'] });
  });

  it('classifies docker-compose.yml as type build', () => {
    mockExecSync.mockReturnValue('M  docker-compose.yml');
    expect(getGroupedChanges()).toEqual({
      'build(root)': ['docker-compose.yml']
    });
  });

  it('classifies pom.xml as type build', () => {
    mockExecSync.mockReturnValue('M  pom.xml');
    expect(getGroupedChanges()).toEqual({ 'build(root)': ['pom.xml'] });
  });

  // ── Type detection: chore ─────────────────────────────────────────────────

  it('classifies .lock file as type chore', () => {
    mockExecSync.mockReturnValue('M  pnpm-lock.yaml');
    // .yaml doesn't match .lock — it falls to fix; test the actual .lock extension
    mockExecSync.mockReturnValue('M  package-lock.json');
    // package-lock.json matches package.json build rule first, but .json isn't .lock
    // Use a file whose only matching rule is chore
    mockExecSync.mockReturnValue('M  yarn.lock');
    expect(getGroupedChanges()).toEqual({ 'chore(root)': ['yarn.lock'] });
  });

  it('classifies .gitignore as type chore', () => {
    mockExecSync.mockReturnValue('M  .gitignore');
    expect(getGroupedChanges()).toEqual({ 'chore(root)': ['.gitignore'] });
  });

  it('classifies .editorconfig as type chore', () => {
    mockExecSync.mockReturnValue('M  .editorconfig');
    expect(getGroupedChanges()).toEqual({ 'chore(root)': ['.editorconfig'] });
  });

  it('classifies .env file as type chore', () => {
    mockExecSync.mockReturnValue('M  .env');
    expect(getGroupedChanges()).toEqual({ 'chore(root)': ['.env'] });
  });

  it('classifies .env.local as type chore', () => {
    mockExecSync.mockReturnValue('M  .env.local');
    expect(getGroupedChanges()).toEqual({ 'chore(root)': ['.env.local'] });
  });

  // ── Type detection: perf ──────────────────────────────────────────────────

  it('classifies file under perf/ as type perf', () => {
    mockExecSync.mockReturnValue('M  perf/bench.ts');
    expect(getGroupedChanges()).toEqual({ 'perf(perf)': ['perf/bench.ts'] });
  });

  it('classifies file under performance/ as type perf', () => {
    mockExecSync.mockReturnValue('M  performance/load.ts');
    expect(getGroupedChanges()).toEqual({
      'perf(performance)': ['performance/load.ts']
    });
  });

  it('classifies file under benchmark/ as type perf', () => {
    mockExecSync.mockReturnValue('M  benchmark/run.ts');
    expect(getGroupedChanges()).toEqual({
      'perf(benchmark)': ['benchmark/run.ts']
    });
  });

  it('classifies file under bench/ as type perf', () => {
    mockExecSync.mockReturnValue('M  bench/measure.ts');
    expect(getGroupedChanges()).toEqual({
      'perf(bench)': ['bench/measure.ts']
    });
  });

  // ── Type detection: refactor ──────────────────────────────────────────────

  it('classifies file under refactor/ as type refactor', () => {
    mockExecSync.mockReturnValue('M  refactor/utils.ts');
    expect(getGroupedChanges()).toEqual({
      'refactor(refactor)': ['refactor/utils.ts']
    });
  });

  // ── Type detection: feat ──────────────────────────────────────────────────

  it('classifies new file with status ?? as type feat', () => {
    mockExecSync.mockReturnValue('?? src/new.ts');
    expect(getGroupedChanges()).toEqual({ 'feat(src)': ['src/new.ts'] });
  });

  it('classifies new file with status A as type feat', () => {
    mockExecSync.mockReturnValue('A  src/new.ts');
    expect(getGroupedChanges()).toEqual({ 'feat(src)': ['src/new.ts'] });
  });

  // ── Type detection: fix (fallback) ────────────────────────────────────────

  it('classifies modified file with status M as type fix', () => {
    mockExecSync.mockReturnValue('M  src/utils.ts');
    expect(getGroupedChanges()).toEqual({ 'fix(src)': ['src/utils.ts'] });
  });

  // ── Module grouping ───────────────────────────────────────────────────────

  it('assigns root module to file at root level', () => {
    mockExecSync.mockReturnValue('M  server.ts');
    expect(getGroupedChanges()).toEqual({ 'fix(root)': ['server.ts'] });
  });

  it('uses top-level directory as module for nested file', () => {
    mockExecSync.mockReturnValue('M  src/deep/nested/file.ts');
    expect(getGroupedChanges()).toEqual({
      'fix(src)': ['src/deep/nested/file.ts']
    });
  });

  it('groups multiple files under same key when type and module match', () => {
    mockExecSync.mockReturnValue('M  src/a.ts\nM  src/b.ts');
    expect(getGroupedChanges()).toEqual({
      'fix(src)': ['src/a.ts', 'src/b.ts']
    });
  });

  it('creates separate keys for files with different types in same module', () => {
    mockExecSync.mockReturnValue('M  src/utils.ts\n?? src/newFeature.ts');
    expect(getGroupedChanges()).toEqual({
      'fix(src)': ['src/utils.ts'],
      'feat(src)': ['src/newFeature.ts']
    });
  });
});

describe('getStagedAnalysisHandler', () => {
  it('returns JSON-encoded grouped changes as text content', async () => {
    mockExecSync.mockReturnValue('M  src/utils.ts');
    const result = await getStagedAnalysisHandler();
    expect(result.content[0]?.type).toBe('text');
    expect(JSON.parse(result.content[0]?.text ?? '')).toEqual({
      'fix(src)': ['src/utils.ts']
    });
  });
});

describe('executeCommit', () => {
  it('stages files and returns success message on successful commit', () => {
    mockExecFileSync.mockReturnValue('1 file changed, 1 insertion(+)');
    const result = executeCommit('feat(src): add feature');
    expect(result.content[0]?.text).toBe(
      'Success: 1 file changed, 1 insertion(+)'
    );
    expect(mockExecFileSync).toHaveBeenCalledWith('git', ['add', '.']);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'git',
      ['commit', '-m', 'feat(src): add feature'],
      { encoding: 'utf8' }
    );
  });

  it('returns error message when commit fails', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('nothing to commit, working tree clean');
    });
    const result = executeCommit('fix(root): attempt commit');
    expect(result.content[0]?.text).toBe(
      'Error: nothing to commit, working tree clean'
    );
  });

  it('returns stringified non-Error throws as error message', () => {
    mockExecFileSync.mockImplementation(() => {
      throw 'git: command not found';
    });
    const result = executeCommit('chore(root): test');
    expect(result.content[0]?.text).toBe('Error: git: command not found');
  });
});
