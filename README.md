# SkypeAPI
A generic API for accessing and interacting with Skype.

### TODO:
  - Clean up code.
  - Format events nicely.
  - Wiki.
  
## Usage:

  ```
  var SkypeAPI = require('SkypeAPI');
  
  var skype = new SkypeAPI({
    username: 'USERNAME',
    password: 'PASSWORD'
  });
  
  skype.on('Chat', function (e) {
    skype.sendMessage(e.channel, e.content);
  });
  ```
  
## Pull Request Formatting:
  - Single quotes.
  - Four spaces.

## Contributors:
  - Zegura (author)
