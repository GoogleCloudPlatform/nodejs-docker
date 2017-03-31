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
  readonly logs: Array<string> = [];
  readonly errors: Array<string> = [];

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
  readonly pathsRead: Array<Location> = [];
  readonly pathsLocated: Array<Location> = [];
  readonly pathsWritten: Array<Location> = [];

  constructor(private configs: ReadonlyArray<Location>) {}

  private findLocation(path: string): Location|undefined {
    return this.configs.find((value: Location): boolean => {
      return value.path === path;
    });
  }

  async read(path: string): Promise<string|undefined> {
    const location = this.findLocation(path);
    if (!location || !location.exists) {
      throw new Error(`Path not found ${path}`);
    }

    this.pathsRead.push(location);
    return location.contents;
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
