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

/**
 * Represents an entity that is capable of reporting messages.
 */
export interface Logger {
  /**
   * Used to specify an informational message intended for end-user
   * consumption.
   *
   * @param message The message to record
   */
  log(message: string): void;

  /**
   * Used to specify an error message intended for end-user consumption.
   *
   * @param message The message to record
   */
  error(messag: string): void;
}
