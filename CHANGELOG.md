# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][unreleased]
### Added
- This CHANGELOG file to hopefully capture any change notes
- Wildcard values for project domain setting
- Allow specifying external config to load at startup
- Generate and use home-based general config meant to hold user-defined configurations
- HTTPS support
- HTTPS service configurable via config settings
- Enable/disable HTTPS via config setting
- Code Climate badge for README
- Dependency badge for README
- Project output logging
- Configurable log file extensions
- API endpoint for updating project metadata

### Changed
- TINKR_HOME environment variable to TINKRD_HOME
- TINKR_PORT environment variable to TINKRD_PORT
- TINKR_HTTPS_PORT environment variable to TINKRD_HTTPS_PORT
- TINKR_CONFIG environment variable to TINKRD_CONFIG
- Name in configuration from Tinkr to Tinkrd
- Default home directory from $HOME/.tinkr to $HOME/.tinkrd
- Upgraded note-netstat dependency to v0.8.0
- Enable/disable HTTP via config setting
- Disable Tinkr API support over HTTP by default
- Upgrade body-parser to v1.12.13
- Upgrade commander to v2.8.1
- Upgrade express to v4.12.3
- Upgrade fs-extra to v0.18.2
- Upgrade http-proxy to v1.11.1
- Upgrade lodash to v3.8.0
- Upgrade morgan to v1.5.2
- Upgrade nedb to v1.1.2
- Upgrade toml to v2.2.2

[unreleased]: https://github.com/danielkrainas/tinkr/compare/v0.1.11...HEAD