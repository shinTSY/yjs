
import {
  readYArray,
  readYMap,
  readYText,
  readYXmlElement,
  readYXmlFragment,
  readYXmlHook,
  readYXmlText,
  StructStore, Transaction, Item, YEvent, AbstractType // eslint-disable-line
} from '../internals.js'

import * as encoding from 'lib0/encoding.js' // eslint-disable-line
import * as decoding from 'lib0/decoding.js'
import * as error from 'lib0/error.js'

/**
 * @type {Array<function(decoding.Decoder):AbstractType<any>>}
 * @private
 */
export const typeRefs = [
  readYArray,
  readYMap,
  readYText,
  readYXmlElement,
  readYXmlFragment,
  readYXmlHook,
  readYXmlText
]

export const YArrayRefID = 0
export const YMapRefID = 1
export const YTextRefID = 2
export const YXmlElementRefID = 3
export const YXmlFragmentRefID = 4
export const YXmlHookRefID = 5
export const YXmlTextRefID = 6

/**
 * @private
 */
export class ContentType {
  /**
   * @param {AbstractType<YEvent>} type
   */
  constructor (type) {
    /**
     * @type {AbstractType<any>}
     */
    this.type = type
  }

  /**
   * @return {number}
   */
  getLength () {
    return 1
  }

  /**
   * @return {Array<any>}
   */
  getContent () {
    return [this.type]
  }

  /**
   * @return {boolean}
   */
  isCountable () {
    return true
  }

  /**
   * @return {ContentType}
   */
  copy () {
    return new ContentType(this.type._copy())
  }

  /**
   * @param {number} offset
   * @return {ContentType}
   */
  splice (offset) {
    throw error.methodUnimplemented()
  }

  /**
   * @param {ContentType} right
   * @return {boolean}
   */
  mergeWith (right) {
    return false
  }

  /**
   * @param {Transaction} transaction
   * @param {Item} item
   */
  integrate (transaction, item) {
    this.type._integrate(transaction.doc, item)
  }

  /**
   * @param {Transaction} transaction
   */
  delete (transaction) {
    let item = this.type._start
    while (item !== null) {
      if (!item.deleted) {
        item.delete(transaction)
      } else {
        // Whis will be gc'd later and we want to merge it if possible
        // We try to merge all deleted items after each transaction,
        // but we have no knowledge about that this needs to be merged
        // since it is not in transaction.ds. Hence we add it to transaction._mergeStructs
        transaction._mergeStructs.add(item.id)
      }
      item = item.right
    }
    this.type._map.forEach(item => {
      if (!item.deleted) {
        item.delete(transaction)
      } else {
        // same as above
        transaction._mergeStructs.add(item.id)
      }
    })
    transaction.changed.delete(this.type)
  }

  /**
   * @param {StructStore} store
   */
  gc (store) {
    let item = this.type._start
    while (item !== null) {
      item.gc(store, true)
      item = item.right
    }
    this.type._start = null
    this.type._map.forEach(/** @param {Item | null} item */ (item) => {
      while (item !== null) {
        item.gc(store, true)
        item = item.left
      }
    })
    this.type._map = new Map()
  }

  /**
   * @param {encoding.Encoder} encoder
   * @param {number} offset
   */
  write (encoder, offset) {
    this.type._write(encoder)
  }

  /**
   * @return {number}
   */
  getRef () {
    return 7
  }
}

/**
 * @private
 *
 * @param {decoding.Decoder} decoder
 * @return {ContentType}
 */
export const readContentType = decoder => new ContentType(typeRefs[decoding.readVarUint(decoder)](decoder))
