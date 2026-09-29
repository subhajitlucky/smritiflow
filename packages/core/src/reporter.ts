export interface Reporter {
  log(message: string): void;
}

export const consoleReporter: Reporter = {
  log(message: string): void {
    console.log(message);
  },
};

export const silentReporter: Reporter = {
  log(): void {},
};
