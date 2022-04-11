import express, { Application, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { ApiError, NotFoundError } from './utils/ApiError';
import { asyncWrapper } from './utils/asyncWrapper';
import { StatusCodes } from 'http-status-codes';
const app: Application = express();
const PORT = 3001;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get(
  '/protected',
  asyncWrapper(async (req: Request, res: Response) => {
    await customFunction();
    // throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized to access this!');
  }),
);

const customFunction = async () => {
  throw new ApiError(StatusCodes.BAD_REQUEST, 'This is just a bad request!');
};

app.post('/post', async (req: Request, res: Response): Promise<Response> => {
  console.log(req.body);
  return res.status(200).send({
    message: 'Hello World from post!',
  });
});

app.use((req: Request, res: Response, next: NextFunction) => next(new NotFoundError(req.path)));

app.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).send({
    success: false,
    message: err.message,
    stack: err.stack,
  });
});

try {
  app.listen(PORT, (): void => {
    console.log(`Connected successfully on port ${PORT}`);
  });
} catch (error: any) {
  console.error(`Error occured: ${error.message}`);
}

process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  console.log(reason.name, reason.message);
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  process.exit(1);
  throw reason;
});

process.on('uncaughtException', (err: Error) => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');

  process.exit(1);
});
