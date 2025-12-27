# Quality Gates

This document defines the quality criteria that must be met before code can progress through different stages.

## Pre-Commit

- [ ] Code compiles without errors
- [ ] Linting passes
- [ ] Unit tests pass
- [ ] No secrets or sensitive data committed

## Pre-Merge (Pull Request)

- [ ] All pre-commit checks pass
- [ ] Code review approved
- [ ] Test coverage meets minimum threshold
- [ ] Documentation updated if needed
- [ ] No merge conflicts

## Pre-Release

- [ ] All pre-merge checks pass
- [ ] Integration tests pass
- [ ] Performance benchmarks acceptable
- [ ] Security scan completed
- [ ] Changelog updated

## Metrics Thresholds

| Metric | Minimum | Target |
|--------|---------|--------|
| Test Coverage | | |
| Build Time | | |
| Bundle Size | | |
| Lighthouse Score | | |
