export class EmailError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = "EMAIL_ERROR",
    context?: Record<string, any>,
  ) {
    super(message);
    this.name = "EmailError";
    this.code = code;
    this.context = context;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmailError);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

export class EmailProviderError extends EmailError {
  public readonly provider: string;
  public readonly providerCode?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    provider: string,
    options?: {
      providerCode?: string;
      retryable?: boolean;
      context?: Record<string, any>;
    },
  ) {
    super(message, "EMAIL_PROVIDER_ERROR", {
      ...options?.context,
      provider,
      providerCode: options?.providerCode,
    });
    this.name = "EmailProviderError";
    this.provider = provider;
    this.providerCode = options?.providerCode;
    this.retryable = options?.retryable ?? false;
  }
}

export const isEmailError = (error: unknown): error is EmailError => {
  return error instanceof EmailError;
};