# SkypeAPI
A generic API for accessing and interacting with Skype.

Unlike some other 3rd-party API's for Skype, this one requires no Skype client to be running.

#### Warning:
##### This API only works for "modern" Skype (Cloud-based chats).

This project is under heavy development, not to mention Microsoft may change things at any time.
Be prepared for things to randomly change/stop working.

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
  - Legible.

## Contributors:
  - Zegura (author)
