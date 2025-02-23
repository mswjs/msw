import { invariant } from 'outvariant'
import { StandardSchemaV1 } from '@standard-schema/spec'
import { InternalError } from '../utils/internal/devUtils'
import { HttpResponse } from '../HttpResponse'
import { AsyncCollection, TransactionCallback } from '../AsyncCollection'

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
  public async open<Name extends keyof Collections & string>(
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
      name,
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
  private schema: StandardSchemaV1<RecordType>
  private collection: AsyncCollection<RecordType>

  constructor(args: { name: string; schema: StandardSchemaV1<RecordType> }) {
    this.name = args.name
    this.schema = args.schema
    this.collection = new AsyncCollection(this.name)
  }

  public async all(): Promise<Array<RecordType>> {
    return this.collection.all()
  }

  /**
   * Returns the record with the given key.
   */
  public async get(key: string): Promise<RecordType | undefined> {
    return this.collection.get(key)
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

    await this.collection.put(key, validationResult.value)
    return validationResult.value
  }

  /**
   * Returns the first record matching the predicate.
   */
  public async findFirst(
    predicate: CollectionPredicate<RecordType>,
  ): Promise<RecordType | undefined> {
    let foundRecord: RecordType | undefined

    this.collection.forEach((value, key, done) => {
      if (predicate(value, key)) {
        foundRecord = value
        done()
      }
    })

    return foundRecord
  }

  /**
   * Returns all records matching the predicate.
   */
  public async findMany(
    predicate: CollectionPredicate<RecordType>,
  ): Promise<Array<RecordType>> {
    const foundRecords: Array<RecordType> = []

    this.collection.forEach((value, key) => {
      if (predicate(value, key)) {
        foundRecords.push(value)
      }
    })

    return foundRecords
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
    await this.collection.put(foundKey, nextRecord)
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
    const updates: Array<TransactionCallback<RecordType>> = []

    this.collection.forEach((value, key) => {
      if (predicate(value, key)) {
        const nextRecord = update(value, key)
        nextRecords.push(nextRecord)
        updates.push((store) => {
          store[key] = nextRecord
        })
      }
    })

    await this.collection.transaction((store) => {
      updates.forEach((update) => update(store))
    })

    return nextRecords
  }

  /**
   * Deletes a record with the given key from this collection.
   */
  public async delete(key: string): Promise<RecordType | undefined> {
    const deletedRecord = await this.get(key)
    if (deletedRecord) {
      await this.collection.delete(key)
    }
    return deletedRecord
  }

  /**
   * Deletes the first record matching the predicate.
   * Returns the deleted record. If no matching record is found,
   * returns undefined.
   */
  public async deleteFirst(
    predicate: CollectionPredicate<RecordType>,
  ): Promise<RecordType | undefined> {
    let deletedRecordKey: string | undefined
    let deletedRecord: RecordType | undefined

    this.collection.forEach((value, key, done) => {
      if (predicate(value, key)) {
        deletedRecordKey = key
        deletedRecord = value
        done()
      }
    })

    if (deletedRecordKey) {
      await this.collection.delete(deletedRecordKey)
    }

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
    const deletes: Array<TransactionCallback<RecordType>> = []

    this.collection.forEach((value, key) => {
      if (predicate(value, key)) {
        deletedRecords.push(value)
        deletes.push((store) => {
          delete store[key]
        })
      }
    })

    await this.collection.transaction((store) => {
      deletes.forEach((update) => update(store))
    })

    return deletedRecords
  }

  /**
   * Deletes all records in this collection.
   */
  public async deleteAll(): Promise<void> {
    await this.collection.clear()
  }
}

export function defineStore<
  Collections extends CollectionsDefinition,
>(options: { collections: Collections }) {
  return new Store({
    collections: options.collections,
  })
}
