import { invariant } from 'outvariant'
import { StandardSchemaV1 } from '@standard-schema/spec'
import { InternalError } from '../utils/internal/devUtils'

type CollectionsDefinition = {
  [collectionName: string]: StandardSchemaV1
}

class Store<Collections extends CollectionsDefinition> {
  private collectionDefinitions: Collections
  private collectionNames: Array<keyof Collections>
  private collections: Map<keyof Collections, Collection<any>>

  constructor(options: { collections: Collections }) {
    this.collectionDefinitions = options.collections
    this.collectionNames = Object.keys(options.collections)
    this.collections = new Map()
  }

  /**
   * Opens a new collection.
   * If the collection already exists, returns its reference.
   */
  public open<Name extends keyof Collections>(
    name: Name,
  ): Collection<StandardSchemaV1.InferInput<Collections[Name]>> {
    const collectionDefinition = this.collectionDefinitions[name]

    invariant(
      collectionDefinition,
      'Failed to open a store: expected a known collection (%s) but got "%s"',
      this.collectionNames.join(', '),
      name,
    )

    const existingCollection = this.collections.get(name)

    if (existingCollection) {
      return existingCollection
    }

    const newCollection = new Collection<any>({
      name: name as any,
      schema: collectionDefinition,
    })
    this.collections.set(name, newCollection)

    return newCollection
  }
}

class Collection<V> {
  private name: string
  private records: Map<string, V>
  private schema: StandardSchemaV1<V>

  constructor(args: { name: string; schema: StandardSchemaV1<V> }) {
    this.name = args.name
    this.schema = args.schema
    this.records = new Map()
  }

  public get(key: string): V | undefined {
    return this.records.get(key)
  }

  /**
   * Adds a new record to this collection.
   */
  public async put(key: string, record: V): Promise<V> {
    const validationResult = await this.schema['~standard'].validate(record)

    invariant.as(
      InternalError,
      validationResult.issues == null,
      `\
Failed to put record with key "%s" to the collection "%s": provided input does not match the schema.

Input: %o

Validation error:`,
      key,
      this.name,
      record,
      JSON.stringify(validationResult.issues, null, 2),
    )

    this.records.set(key.toString(), validationResult.value)
    return validationResult.value
  }

  /**
   * Deletes a record with the given key from this collection.
   */
  public delete(key: string): void {
    this.records.delete(key)
  }

  /**
   * Clears the entire collection, deleting all its records.
   */
  public clear(): void {
    this.records.clear()
  }
}

export function defineStore<C extends CollectionsDefinition>(options: {
  collections: C
}) {
  return new Store({
    collections: options.collections,
  })
}
