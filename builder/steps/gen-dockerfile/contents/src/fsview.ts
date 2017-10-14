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

/**
 * Represents an entity that is capable of reading a filesystem or a
 * representation of a filesystem.
 */
export interface Reader {
  /**
   * Used to get the contents of the file specified by the given path.
   *
   * @param path The path that specifies the file to read where the
   *             path's delimiter is the same as what is used by the
   *             {@link path} module.
   *
   * @throws If the specified file could not be read.
   *
   * @return A {@link Promise} so that this method can be used with
   *         async/await.
   */
  read(path: string): Promise<string>;
}

/**
 * Represents an entity that is capable of writing to a filesystem or a
 * representation of a filesystem.
 */
export interface Writer {
  /**
   * Used to write the specified contents to the file specified by the
   * given path.
   *
   * @param path The path that specifies the file to write where the
   *             path's delimiter is the same as what is used by the
   *             {@link path} module.
   * @param contents Specifies the text to write to the specified file.
   *
   * @throws If the specified file could not be written.
   *
   * @return A {@link Promise} so that this method can be used with
   *         async/await.
   */
  write(path: string, contents: string): Promise<void>;
}

/**
 * Represents an entity that is capable of determining whether or not
 * a file or directory exists in a filesystem or a representation of a
 * filesystem.
 */
export interface Locator {
  /**
   * Used to determine if the file or directory specified by the given path
   * exists.
   *
   * @param path The path that specifies the file to check where the
   *             path's delimiter is the same as what is used by the
   *             {@link path} module.
   *
   * @return A {@link Promise} so that this method can be used with
   *         async/await.
   */
  exists(path: string): Promise<boolean>;
}

/**
 * A concrete implementation of a {@link Reader}, {@link Writer}, and
 * {@link Locator} that is used to process a directory of the actual
 * filesystem.
 */
export class FsView implements Reader, Writer, Locator {
  constructor(
      /** The path to the directory to process. */
      private basePath: string) {}

  /**
   * Used to get the aboslute path relative to this view's base directory
   * given a path relative to that directory.
   *
   * @param relPath The path of a file or directory relative to this view's
   *                base directory.
   */
  private resolvePath(relPath: string) {
    return path.join(this.basePath, relPath);
  }

  /** @inheritdoc */
  async read(p: string) {
    return pify(fs.readFile)(this.resolvePath(p), 'utf8');
  }

  /** @inheritdoc */
  async write(p: string, contents: string) {
    return pify(fs.writeFile)(this.resolvePath(p), contents, 'utf8');
  }

  /** @inheritdoc */
  async exists(p: string) {
    return fs.existsSync(this.resolvePath(p));
  }
}
