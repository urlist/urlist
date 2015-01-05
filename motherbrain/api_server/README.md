URList API Server
=================

###Introduction
A Tornado server which manage authentication and *motherbrain* messaging.

###Layout
- **conf.py**: User settings default, command line and config file parsing.
- **urls.py**: Endpoint handlers.
- **server.py**: Spawn the server ioloop and initialize a *Motherbrain Dispatcher*.
- **handlers/api.py**: Endpoint handlers to motherbrain actions / message dispatcher.
- **handlers/debug.py**: Endpoint handlers to perform debug task.
- **handlers/auth.py**: Endpoint handlers to *login*.
- **handlers/monitor.py**: Endpoint handlers to monitoring.
- **handlers/tracking.py**: Endpoint handlers to monitoring.
- **auth/**: Contains classes to manage authentication with various oauth provider.

###Authentication
Authentication is managed by *UrlistHandler* by overriding the super method *get_current_user*.
Two different kind of authentication methods are available:

- authentication by *oauth provider*;
- authentication by *urlist_api_token*.

####Authentication by OAuth provider
Require at least three cookies:

- **oauth_token**
- **oauth_user_id**
- **oauth_provider**

A method to perform OAuth authentication using the specified provider should exists and it's name must use the following format:

**get_current_{oauth_provider}_user**

Example:

**get_current_facebook_user**

*oauth_token* and *oauth_user_id* will be passed to this method which has to raise a OAuthException or return an db.users item, otherwise a fallback method is called.
Fallback method invoke *Authentication by API Token* by default.

###Non Blocking Operations
All messaging with motherbrain should be done by using *tornado.web.asynchronous*
and *tornado.gen.engine* handler decorators. This require the use of asynchronous dispatcher like
*MBAsyncDispatcher* or *MBDispatcherCluster*.

###API Usage Example
#### Login
`curl -c cookie_jar http://urli.st/api/login --data '{"email": "alberto+test@urli.st", "password": "turingclubitaliano"}'`

#### Performing an API Server Action
`curl -b cookie_jar http://urli.st/api/whoami`

#### Performing a Motherbrain Action
`curl -b cookie_jar http://urli.st/api/motherbrain --data '[null, "fetch-list", {"list_hash": "Yyc"}, {}, {}]'`

#### Understanding Motherbrain Messages

#### A message
`[id, action, target, payload, context]`

- id (string): An ID used to perform dispatch. Should be unique. *null* to let the server assign a new one.
- action (string): A valid Motherbrain action.
- target (dictionary): A dictionary of target keys. 
- payload (dictionary): A dictionary of non-target arguments.
- context dictionary): Should always be *null*, server will populate it.
