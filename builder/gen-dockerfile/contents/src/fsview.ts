
import * as fs from 'fs';
import * as path from 'path';

export interface Reader {
  read(path: string): Promise<string>
}

export interface Writer {
  write(path: string, contents: string): Promise<any>
}

export interface Locator {
  exists(path: string): Promise<boolean>
}

export class FsView implements Reader, Writer, Locator {
  constructor(private basePath: string) {
  }

  private resolvePath(name: string) {
    return path.join(this.basePath, name);
  }

  async read(path: string) {
    return new Promise<string>((resolve, reject) => {
      fs.readFile(this.resolvePath(path), 'utf8', (err, data) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(data);
        }
      });
    });
  }

  async write(path: string, contents: string) {
    return new Promise<any>((resolve, reject) => {
      fs.writeFile(this.resolvePath(path), contents, 'utf8', err => {
        if (err) {
          reject(err);
        }
        else {
          resolve(null);
        }
      });
    });
  }

  async exists(path: string) {
    return new Promise<boolean>((resolve, reject) => {
      resolve(fs.existsSync(this.resolvePath(path)));
    });
  }
}
