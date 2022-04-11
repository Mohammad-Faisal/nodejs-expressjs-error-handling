## Description of the project

Read the full article: https://www.mohammadfaisal.dev/blog/error-handling-nodejs-express

Today we will learn how we can handle errors in a ExpressJS application. There are several types of errors that can happen in an application.

- Application Error
- Validation Error
- Runtime Error
- Database Error

We will see how we can easily

### Get a basic express application

Run the following command to get a basic express application built with typescript.

```sh
git clone https://github.com/Mohammad-Faisal/express-typescript-skeleton.git
```

### Handle not found url errors

After all the routes add the following code to catch all unmatched routes and send back a proper error response.

```js
app.use('*', (req: Request, res: Response) => {
  const err = Error(`Requested path ${req.path} not found`);
  res.status(404).send({
    success: false,
    message: 'Requested path ${req.path} not found',
    stack: err.stack,
  });
});
```

### Handle all errors with a special middleware

Now we have a special middleware in express that handles all the errors for us. We just have to include it at the end of all the routes and pass down all the errors from the top level so that this middleware can handle it for us.

Let's add it to our index file

```js
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = 500;
  res.status(statusCode).send({
    success: false,
    message: err.message,
    stack: err.stack,
  });
});
```

And modify our previous code to pass down the error like the following

```js
app.use('*', (req: Request, res: Response, next: NextFunction) => {
  const err = Error(`Requested path ${req.path} not found`);
  next(err);
});
```

Now if we hit a random url something like **http://localhost:3001/posta** then we will get a proper error response with the stack.

```json
{
  "success": false,
  "message": "Requested path ${req.path} not found",
  "stack": "Error: Requested path / not found\n    at /Users/mohammadfaisal/Documents/learning/express-typescript-skeleton/src/index.ts:23:15\n"
}
```

### Let's modify our error object to be more powerful

Let's have a closer look at the NodeJS provided default error object.

```js
interface Error {
  name: string;
  message: string;
  stack?: string;
}
```

So when you are throwing an error like the following

```js
throw new Error('Some message');
```

Then you are only getting the name and the optional stack properties with it.

But we may want to add some more information in the error object itself.

Also we may want to differentiate between various error objects.

Let's design a basic Custom error class for our application.

```js
export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);

    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

Notice the following line

```js
Error.captureStackTrace(this, this.constructor);
```

It helps to capture the stack trace of the error from anywhere in the application.

In this simple class we can append the **statusCode** as well.
Let's modify our previous code like the following.

```js
app.use('*', (req: Request, res: Response, next: NextFunction) => {
  const err = new ApiError(404, `Requested path ${req.path} not found`);
  next(err);
});
```

And take advantage of the new **statusCode** property in the error handler middleware as well

```js
app.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).send({
    success: false,
    message: err.message,
    stack: err.stack,
  });
});
```

### Let's handle application errors

Now let's throw a custom error from inside our routes as well.

```js
app.get('/protected', async (req: Request, res: Response, next: NextFunction) => {
  try {
    throw new ApiError(401, 'You are not authorized to access this!');
  } catch (err) {
    next(err);
  }
});
```

This is an artificially created situation where we need to throw an error. The real life we may have many situations where we need to use this kind of **try/catch** block to catch errors.

If we hit the following url **http://localhost:3001/protected** we will get the following response.

```json
{
  "success": false,
  "message": "You are not authorized to access this!",
  "stack": "Error: You are not authorized to access this!\n    at /Users/mohammadfaisal/Documents/learning/express-typescript-skeleton/src/index.ts:12:11\n"
}
```

So our error is working correctly!

### Let's improve on this!

So we now can handle our custom errors from anywhere in the application. But it requires a try catch block everywhere and requires calling the **next** function with the error object.

This is not ideal. It will make our code look bad in no time.

Let's create a custom wrapper function that will capture all the errors and call the next function from a central place.

```js
import { Request, Response, NextFunction } from 'express';

export const asyncWrapper = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};
```

And use it inside our router.

```js
import { asyncWrapper } from './utils/asyncWrapper';

app.get(
  '/protected',
  asyncWrapper(async (req: Request, res: Response) => {
    throw new ApiError(401, 'You are not authorized to access this!');
  }),
);
```

Run the code and see that we have the same results. This helps us to get rid of all try/catch blocks and calling the next function everywhere!

### Example of a custom error

We can fine tune our errors to our need. Let's create a new error class for our not found routes.

```js
export class NotFoundError extends ApiError {
  constructor(path: string) {
    super(404, `The requested path ${path} not found!`);
  }
}
```

And simplify our bad route handler

```js
app.use((req: Request, res: Response, next: NextFunction) => next(new NotFoundError(req.path)));
```

How cool is that?

Now Lets install a small little package to avoid writing the status codes all by ourselves.

```sh
yarn add http-status-codes
```

And add the status code in a meaningful way

```js
export class NotFoundError extends ApiError {
  constructor(path: string) {
    super(StatusCodes.NOT_FOUND, `The requested path ${path} not found!`);
  }
}
```

and our route like this.

```js
app.get(
  '/protected',
  asyncWrapper(async (req: Request, res: Response) => {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized to access this!');
  }),
);
```

It just makes our code a bit better.

### Handle programmer errors.

The best way to deal with programmer errors is to restart gracefully.

```js
process.on('uncaughtException', (err: Error) => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');

  process.exit(1);
});
```

### Handle unhandled promise rejections.

We can log the reason of the promise rejection. These errors never make it to our express error handler. For example if we want to access database with wrong password.

```js
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  console.log(reason.name, reason.message);
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  process.exit(1);
  throw reason;
});
```
