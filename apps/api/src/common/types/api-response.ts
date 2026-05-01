export type ApiSuccessResponse<T> = {
  code: 0;
  message: 'ok';
  data: T;
};

export function ok<T>(data: T): ApiSuccessResponse<T> {
  return {
    code: 0,
    message: 'ok',
    data,
  };
}
