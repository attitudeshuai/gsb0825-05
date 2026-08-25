import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function convertDecimals(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (
    typeof obj === 'object' &&
    typeof obj.toNumber === 'function' &&
    typeof obj.toString === 'function' &&
    !Array.isArray(obj)
  ) {
    return obj.toNumber();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertDecimals);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertDecimals(obj[key]);
    }
    return result;
  }

  return obj;
}

@Injectable()
export class DecimalTransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => convertDecimals(data)));
  }
}
