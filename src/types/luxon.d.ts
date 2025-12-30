declare module "luxon" {
  export class DateTime {
    static fromISO(iso: string, options?: { zone?: string }): DateTime;
    isValid: boolean;
    toUTC(): DateTime;
    toJSDate(): Date;
  }
}

