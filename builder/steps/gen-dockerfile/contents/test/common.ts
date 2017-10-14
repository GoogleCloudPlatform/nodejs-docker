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

import {Locator, Reader, Writer} from '../src/fsview';
import {Logger} from '../src/logger';

export class MockLogger implements Logger {
  readonly logs: string[] = [];
  readonly errors: string[] = [];

  log(message: string): void {
    this.logs.push(message);
  }

  error(message: string): void {
    this.errors.push(message);
  }
}

export interface Location {
  readonly path: string;
  readonly exists: boolean;
  readonly contents?: string;
}

export class MockView implements Reader, Writer, Locator {
  readonly configs: ReadonlyArray<Location>;
  readonly pathsRead: Location[] = [];
  readonly pathsLocated: Location[] = [];
  readonly pathsWritten: Location[] = [];

  constructor(configurations: ReadonlyArray<Location>) {
    const paths = new Set<string>();
    const uniqueConfigs: Location[] = [];
    for (let conf of configurations) {
      if (paths.has(conf.path)) {
        throw new Error(`Cannot specify the same path twice: ${
            JSON.stringify(conf, null, 2)}`);
      }
      paths.add(conf.path);
      uniqueConfigs.push(conf);
    }
    this.configs = uniqueConfigs;
  }

  private findLocation(path: string): Location|undefined {
    const resolvedPath = path.replace(/\.\//g, '');
    return this.configs.find((value: Location): boolean => {
      return value.path === resolvedPath;
    });
  }

  async read(path: string): Promise<string> {
    const location = this.findLocation(path);
    if (!location || !location.exists) {
      throw new Error(`Path not found ${path}`);
    }

    this.pathsRead.push(location);
    return location.contents || '';
  }

  async exists(path: string): Promise<boolean> {
    const location = this.findLocation(path);
    if (!location) {
      throw new Error(
          'Existence of unknown path "' + path + '" requested.  ' +
          'Unit tests must explicitly list which paths exist ' +
          'and don\'t exist');
    }

    this.pathsLocated.push(location);
    return location.exists;
  }

  async write(path: string, contents: string): Promise<void> {
    this.pathsWritten.push({path: path, exists: true, contents: contents});
  }
}
