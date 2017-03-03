
import * as fs from 'fs';
import * as path from 'path';
import * as pify from 'pify';

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
    return pify(fs.readFile)(this.resolvePath(path), 'utf8');
  }

  async write(path: string, contents: string) {
    return pify(fs.writeFile)(this.resolvePath(path), contents, 'utf8');
  }

  async exists(path: string) {
    return fs.existsSync(this.resolvePath(path));
  }
}
