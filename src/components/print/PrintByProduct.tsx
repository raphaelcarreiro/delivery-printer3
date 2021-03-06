import React, { useEffect, useState, Fragment } from 'react';
import { remote } from 'electron';
import { makeStyles } from '@material-ui/styles';
import { OrderData, ProductPrinterData } from '@src/types/order';
import { api } from '@src/services/api';
import PrintTypography from '@src/components/print-typography/PrintTypography';
import { Theme } from '@material-ui/core';
import { useSelector } from '@src/store/selector';
import Complements from './Complements';

interface UseStylesProps {
  fontSize: number;
}

const useStyles = makeStyles<Theme, UseStylesProps>({
  container: props => ({
    maxWidth: '80mm',
    padding: '15px 15px 30px 15px',
    backgroundColor: '#faebd7',
    border: '2px dashed #ccc',
    fontSize: props.fontSize,
    '@media print': {
      '&': {
        backgroundColor: 'transparent',
        border: 'none',
        padding: 0,
        marginRight: 30,
      },
    },
  }),
  products: {
    padding: '7px 0 0',
    borderTop: '1px dashed #333',
  },
  complement: {
    marginLeft: 6,
  },
  additional: {
    marginRight: 6,
  },
  ingredient: {
    marginRight: 6,
  },
  headerProducts: {
    marginTop: 7,
  },
  product: {
    width: '100%',
    paddingBottom: 10,
  },
  productAmount: {
    minWidth: 25,
    paddingBottom: 10,
    display: 'flex',
    paddingTop: 0,
  },
  complementCategory: {
    display: 'grid',
    gridTemplateColumns: '0.5fr 1fr',
  },
  additionalInfoContainer: {
    display: 'flex',
    flexWrap: 'wrap',
  },
});

interface PrintProps {
  handleClose(): void;
  order: OrderData;
}

const PrintByProduct: React.FC<PrintProps> = ({ handleClose, order }) => {
  const restaurant = useSelector(state => state.restaurant);

  const classes = useStyles({
    fontSize: restaurant?.printer_setting.font_size || 14,
  });

  const [products, setProducts] = useState<ProductPrinterData[]>([]);
  const [toPrint, setToPrint] = useState<ProductPrinterData[]>([]);

  // close if there is not printer in product
  useEffect(() => {
    const check = order.products.some(product => product.printer);
    if (!check) handleClose();
  }, [handleClose, order]);

  // get product printers
  useEffect(() => {
    if (!order) return;

    let productsToPrint: ProductPrinterData[] = [];
    order.products.forEach(product => {
      if (product.printer) {
        let i = 1;
        do {
          productsToPrint.push({
            id: `${product.id}-${i}`,
            productId: product.id,
            name: product.printer.name,
            order,
            printed: false,
            currentAmount: i,
          });
          i += 1;
        } while (i <= product.amount);
      }
    });

    productsToPrint = productsToPrint.map(productToPrint => {
      productToPrint.order = {
        ...order,
        products: order.products.filter(product => product.printer && product.id === productToPrint.productId),
      };
      productToPrint.printed = false;
      return productToPrint;
    });

    setProducts(productsToPrint);
  }, [order]);

  useEffect(() => {
    async function setPrinted() {
      try {
        await api.post(`/orders/printed`, { order_id: order.id });
        console.log(`Alterado situa????o do pedido ${order.id}`);
        handleClose();
      } catch (err) {
        console.log(err);
        handleClose();
      }
    }

    if (products.length > 0) {
      const tp = products.find(p => !p.printed);

      // close if all order products had been printed
      if (!tp) {
        const check = products.every(p => p.printed);
        if (check) setPrinted();
        return;
      }

      setToPrint([tp]);
    }
  }, [products, handleClose, order]);

  // print
  useEffect(() => {
    if (toPrint.length > 0) {
      const [win] = remote.BrowserWindow.getAllWindows();
      const [printing] = toPrint;

      if (!win) return;

      let error = false;

      try {
        win.webContents.print(
          {
            deviceName: printing.name,
            color: false,
            collate: false,
            copies: 1,
            silent: true,
            margins: {
              marginType: 'none',
            },
          },
          success => {
            if (success) {
              setProducts(oldValue =>
                oldValue.map(p => {
                  if (p.id === printing.id) p.printed = true;
                  return p;
                }),
              );
            }
          },
        );
      } catch (err) {
        console.log(err);
        error = true;
      }

      // try to print in default printer
      if (error) {
        try {
          win.webContents.print(
            {
              color: false,
              collate: false,
              copies: 1,
              silent: true,
              margins: {
                marginType: 'none',
              },
            },
            success => {
              if (success) {
                setProducts(oldValue =>
                  oldValue.map(p => {
                    if (p.id === printing.id) p.printed = true;
                    return p;
                  }),
                );
              }
            },
          );
        } catch (err) {
          console.log(err);
          handleClose();
        }
      }
    }
  }, [toPrint, handleClose]);

  return (
    <>
      {toPrint.length > 0 &&
        toPrint.map(printer => (
          <div className={classes.container} key={printer.id}>
            <PrintTypography fontSize={1.2} bold gutterBottom>
              PEDIDO {order.formattedId}
            </PrintTypography>
            <PrintTypography>{order.formattedDate}</PrintTypography>
            <PrintTypography gutterBottom>{order.customer.name}</PrintTypography>
            {order.shipment.shipment_method === 'delivery' && (
              <PrintTypography>
                {`${order.shipment.address}, ${order.shipment.number},
                ${order.shipment.district}, ${order.shipment.city},
                ${order.shipment.region}`}
              </PrintTypography>
            )}
            {order.shipment.shipment_method === 'customer_collect' && !order.shipment.scheduled_at ? (
              <PrintTypography>**Cliente retira**</PrintTypography>
            ) : (
              order.shipment.scheduled_at && (
                <PrintTypography>**Cliente retira ??s {order.shipment.formattedScheduledAt}**</PrintTypography>
              )
            )}
            <table className={classes.headerProducts}>
              <tbody>
                <tr>
                  <td>
                    <PrintTypography>Qtd</PrintTypography>
                  </td>
                  <td>
                    <PrintTypography>Item</PrintTypography>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className={classes.products}>
              <table>
                <tbody>
                  {printer.order.products.map(product => (
                    <tr key={product.id}>
                      <td className={classes.productAmount}>
                        <PrintTypography>{product.amount}x</PrintTypography>
                      </td>
                      <td className={classes.product}>
                        <PrintTypography upperCase bold>
                          {product.name}
                        </PrintTypography>
                        {product.annotation && (
                          <PrintTypography fontSize={0.8}>Obs: {product.annotation}</PrintTypography>
                        )}
                        <div className={classes.additionalInfoContainer}>
                          {product.additional.length > 0 && (
                            <>
                              {product.additional.map(additional => (
                                <PrintTypography display="inline" className={classes.additional} key={additional.id}>
                                  {`c/ ${additional.amount}x ${additional.name}`}
                                </PrintTypography>
                              ))}
                            </>
                          )}
                          {product.ingredients.length > 0 && (
                            <>
                              {product.ingredients.map(ingredient => (
                                <PrintTypography display="inline" className={classes.ingredient} key={ingredient.id}>
                                  {`s/ ${ingredient.name}`}
                                </PrintTypography>
                              ))}
                            </>
                          )}
                        </div>
                        {product.complement_categories.length > 0 && (
                          <>
                            {product.complement_categories.map(category => (
                              <Fragment key={category.id}>
                                {category.complements.length > 0 && (
                                  <div className={classes.complementCategory}>
                                    <PrintTypography italic>{category.print_name || category.name}</PrintTypography>
                                    <Complements complementCategory={category} />
                                  </div>
                                )}
                              </Fragment>
                            ))}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PrintTypography align="center">.</PrintTypography>
          </div>
        ))}
    </>
  );
};

export default PrintByProduct;
