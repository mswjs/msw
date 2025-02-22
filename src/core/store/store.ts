import { invariant } from 'outvariant'
import { StandardSchemaV1 } from '@standard-schema/spec'
import { InternalError } from '../utils/internal/devUtils'
import { HttpResponse } from '../HttpResponse'

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

type CollectionPredicate<V> = (value: V, key: string) => boolean
type CollectionUpdateFunction<V> = (nextValue: V, key: string) => V

class Collection<V> {
  private name: string
  private records: Map<string, V>
  private schema: StandardSchemaV1<V>

  constructor(args: { name: string; schema: StandardSchemaV1<V> }) {
    this.name = args.name
    this.schema = args.schema
    this.records = new Map()
  }

  /**
   * Returns the record with the given key.
   */
  public async get(key: string): Promise<V | undefined> {
    return this.records.get(key)
  }

  /**
   * Adds a new record to this collection.
   * If the record by this key already exists, overrides the record.
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
   * Returns the first record matching the given predicate.
   */
  public async findFirst(
    predicate: CollectionPredicate<V>,
  ): Promise<V | undefined> {
    for (const [key, value] of this.records) {
      if (predicate(value, key)) {
        return value
      }
    }
  }

  /**
   * Returns all records matching the given predicate.
   */
  public async findMany(predicate: CollectionPredicate<V>): Promise<Array<V>> {
    const results: Array<V> = []

    for (const [key, value] of this.records) {
      if (predicate(value, key)) {
        results.push(value)
      }
    }

    return results
  }

  /**
   * Updates the recording matching the given predicate.
   * Returns the updated record.
   */
  public async update(
    predicate: CollectionPredicate<V>,
    update: CollectionUpdateFunction<V>,
  ): Promise<V> {
    let foundKey: string | undefined
    const record = await this.findFirst((value, key) => {
      if (predicate(value, key)) {
        foundKey = key
        return true
      }
      return false
    })

    if (record == null) {
      throw HttpResponse.json(
        { error: `Failed to update a record in "${this.name}": not found` },
        { status: 404 },
      )
    }

    invariant(
      foundKey,
      'Failed to update a record in "%s": corrupted key. Please report this as a bug on GitHub.',
      this.name,
    )

    const nextRecord = update(record, foundKey)
    this.records.set(foundKey, nextRecord)
    return nextRecord
  }

  /**
   * Updates all records matching the given predicate.
   * Returns an array of all updated records.
   */
  public async updateMany(
    predicate: CollectionPredicate<V>,
    update: CollectionUpdateFunction<V>,
  ): Promise<Array<V>> {
    const nextRecords: Array<V> = []

    await this.findMany((record, key) => {
      if (predicate(record, key)) {
        nextRecords.push(update(record, key))
        return true
      }
      return false
    })

    return nextRecords
  }

  /**
   * Deletes a record with the given key from this collection.
   */
  public async delete(key: string): Promise<void> {
    this.records.delete(key)
  }

  /**
   * Deletes all records matching the given predicate.
   * Returns an array of deleted records.
   */
  public async deleteMany(
    predicate: CollectionPredicate<V>,
  ): Promise<Array<V>> {
    const deletedRecords: Array<V> = []

    for (const [key, value] of this.records) {
      if (predicate(value, key)) {
        this.records.delete(key)
        deletedRecords.push(value)
      }
    }

    return deletedRecords
  }

  /**
   * Deletes all records in this collection.
   */
  public async deleteAll(): Promise<void> {
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
