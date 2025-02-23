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
  public async open<Name extends keyof Collections>(
    name: Name,
  ): Promise<Collection<StandardSchemaV1.InferInput<Collections[Name]>>> {
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

  public async clear(): Promise<void> {
    this.collections.clear()
  }
}

type CollectionPredicate<RecordType> = (
  value: RecordType,
  key: string,
) => boolean

type CollectionUpdateFunction<RecordType> = (
  nextValue: RecordType,
  key: string,
) => RecordType

class Collection<RecordType> {
  private name: string
  private records: Map<string, RecordType>
  private schema: StandardSchemaV1<RecordType>

  constructor(args: { name: string; schema: StandardSchemaV1<RecordType> }) {
    this.name = args.name
    this.schema = args.schema
    this.records = new Map()
  }

  public async all(): Promise<Array<RecordType>> {
    return Array.from(this.records.values())
  }

  /**
   * Returns the record with the given key.
   */
  public async get(key: string): Promise<RecordType | undefined> {
    return this.records.get(key)
  }

  /**
   * Adds a new record to this collection.
   * If the record by this key already exists, overrides the record.
   */
  public async put(key: string, record: RecordType): Promise<RecordType> {
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
   * Returns the first record matching the predicate.
   */
  public async findFirst(
    predicate: CollectionPredicate<RecordType>,
  ): Promise<RecordType | undefined> {
    for (const [key, value] of this.records) {
      if (predicate(value, key)) {
        return value
      }
    }
  }

  /**
   * Returns all records matching the predicate.
   */
  public async findMany(
    predicate: CollectionPredicate<RecordType>,
  ): Promise<Array<RecordType>> {
    const results: Array<RecordType> = []

    for (const [key, value] of this.records) {
      if (predicate(value, key)) {
        results.push(value)
      }
    }

    return results
  }

  /**
   * Updates the first record matching the predicate.
   * Returns the updated record.
   */
  public async update(
    predicate: CollectionPredicate<RecordType>,
    update: CollectionUpdateFunction<RecordType>,
  ): Promise<RecordType> {
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
   * Updates all records matching the predicate.
   * Returns an array of all updated records.
   */
  public async updateMany(
    predicate: CollectionPredicate<RecordType>,
    update: CollectionUpdateFunction<RecordType>,
  ): Promise<Array<RecordType>> {
    const nextRecords: Array<RecordType> = []

    await this.findMany((record, key) => {
      if (predicate(record, key)) {
        const nextRecord = update(record, key)
        this.records.set(key, nextRecord)
        nextRecords.push(nextRecord)
        return true
      }
      return false
    })

    return nextRecords
  }

  /**
   * Deletes a record with the given key from this collection.
   */
  public async delete(key: string): Promise<RecordType | undefined> {
    const deletedRecord = this.get(key)
    this.records.delete(key)
    return deletedRecord
  }

  /**
   * Deletes the first record matching the predicate.
   */
  public async deleteFirst(
    predicate: CollectionPredicate<RecordType>,
  ): Promise<RecordType | undefined> {
    let deletedRecord: RecordType | undefined

    await this.findFirst((record, key) => {
      if (predicate(record, key)) {
        this.records.delete(key)
        deletedRecord = record
        return true
      }
      return false
    })

    return deletedRecord
  }

  /**
   * Deletes all records matching the predicate.
   * Returns an array of deleted records.
   */
  public async deleteMany(
    predicate: CollectionPredicate<RecordType>,
  ): Promise<Array<RecordType>> {
    const deletedRecords: Array<RecordType> = []

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

export function defineStore<
  Collections extends CollectionsDefinition,
>(options: { collections: Collections }) {
  return new Store({
    collections: options.collections,
  })
}
