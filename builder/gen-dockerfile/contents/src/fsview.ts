/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
