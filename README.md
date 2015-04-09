# Tinkr

Tinkr is designed to be a poor-man's PaaS. Together, with the [tinkr-cli](https://github.com/danielkrainas/tinkr-cli) tool, it is meant to assist in getting new projects from idea stage to deployment in as few steps as possible.

**Please Note:** this is still a work in progress as I flush out the featureset of both client and server. 


## Installation

`$ npm install tinkr -g`


## Usage

The module includes a command called `tinkrd` and can be executed via the command line:

`$ tinkrd`


## But... the cloud!

I've always enjoyed the power, cost efficiency, and general guarantees that come with a dedicated private server. Unfortunately, getting one setup with nginx, sftp, and any other number of required services can be time consuming and frustrating. There's also the cases where I want to make apps for things like my home network, when you might have one or more computers. Tinkr is my solution to both of these problems and more.  


## Features

- reverse http proxy for hosted projects and project stubs.
- http domain routing.
- project versioning support.
- restful API to manage all operations.


## Environment Settings

- **TINKR\_PORT** - port to host the http service (default: 2999).
- **TINKR\_HOME** - folder path where tinkr should store its packages and data files.
 

## Contributions

Contributions are welcome! Fork and send a PR and I'll see about merging. 

## Bugs and Feedback

If you see a bug or have a suggestion, feel free to create an issue [here](https://github.com/danielkrainas/tinkr/issues).

## License

MIT License. Copyright 2014 Daniel Krainas [http://www.danielkrainas.com](http://www.danielkrainas.com)
