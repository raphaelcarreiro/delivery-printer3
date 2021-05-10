import React, { useEffect, useState, Fragment, useMemo } from 'react';
import { remote } from 'electron';
import { makeStyles } from '@material-ui/styles';
import { OrderData } from '@src/types/order';
import PrintTypography from '@src/components/print-typography/PrintTypography';
import { useSelector } from '@src/store/selector';
import { Theme } from '@material-ui/core';
import Complements from './Complements';

interface UseStylesProps {
  fontSize: number;
}

const useStyles = makeStyles<Theme, UseStylesProps>({
  container: props => ({
    maxWidth: '80mm',
    minHeight: 300,
    padding: 15,
    fontSize: props.fontSize,
    backgroundColor: '#faebd7',
    border: '2px dashed #ccc',
    '@media print': {
      '&': {
        backgroundColor: 'transparent',
        border: 'none',
        padding: 0,
        marginRight: 30,
      },
    },
  }),
  annotation: {
    marginLeft: 10,
  },
  products: {
    marginBottom: 15,
    padding: '5px 0 0',
    borderTop: '1px dashed #333',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProducts: {
    marginTop: 7,
  },
  productName: {
    textTransform: 'uppercase',
    fontSize: 16,
    fontWeight: 600,
  },
  product: {
    width: '100%',
    paddingBottom: 10,
  },
  productAmount: {
    minWidth: 25,
    display: 'flex',
    paddingTop: 0,
  },
  customerData: {
    display: 'grid',
    gridTemplateColumns: '75px 1fr',
    marginBottom: 2,
    columnGap: 7,
  },
  title: {
    fontWeight: 600,
  },
  date: {
    marginBottom: 10,
  },
  complementCategory: {
    display: 'grid',
    gridTemplateColumns: '0.5fr 1fr',
    alignItems: 'center',
  },
  totals: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    rowGap: '4px',
    '& div': {
      display: 'flex',
      alignItems: 'center',
    },
  },
  developer: {
    marginTop: 15,
  },
});

interface PrintProps {
  handleClose(): void;
  order: OrderData;
}

const Shipment: React.FC<PrintProps> = ({ handleClose, order }) => {
  const restaurant = useSelector(state => state.restaurant);

  const classes = useStyles({
    fontSize: restaurant ? restaurant.printer_setting.font_size : 14,
  });
  const [toPrint, setToPrint] = useState<OrderData | null>(null);
  const [printedQuantity, setPrintedQuantity] = useState(0);

  const copies = useMemo(() => {
    return restaurant?.printer_setting.shipment_template_copies || 1;
  }, [restaurant]);

  // get product printers
  useEffect(() => {
    if (order) {
      setToPrint({
        ...order,
        printed: false,
      });
    }
  }, [order]);

  useEffect(() => {
    if (!toPrint) return;

    // fecha se o pedido já foi impresso
    if (toPrint.printed) {
      handleClose();
      return;
    }

    if (printedQuantity === copies) {
      setToPrint({
        ...toPrint,
        printed: true,
      });
      return;
    }

    const [win] = remote.BrowserWindow.getAllWindows();

    if (!win) return;

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
          if (!success) return;

          setPrintedQuantity(state => state + 1);
        },
      );
    } catch (err) {
      console.log(err);
      handleClose();
    }
  }, [toPrint, handleClose, copies, printedQuantity]);

  return (
    <>
      {toPrint && !toPrint.printed && (
        <div className={classes.container}>
          <PrintTypography fontSize={1.2} bold gutterBottom>
            PEDIDO {order.formattedId}
          </PrintTypography>
          <PrintTypography gutterBottom>{order.formattedDate}</PrintTypography>
          {order.shipment.shipment_method === 'customer_collect' && !order.shipment.scheduled_at ? (
            <PrintTypography gutterBottom>Cliente retira</PrintTypography>
          ) : (
            order.shipment.scheduled_at && (
              <PrintTypography gutterBottom>Retirada ás {order.shipment.formattedScheduledAt}</PrintTypography>
            )
          )}
          <div className={classes.customerData}>
            <PrintTypography noWrap>Cliente</PrintTypography>
            <PrintTypography>{order.customer.name}</PrintTypography>
          </div>
          <div className={classes.customerData}>
            <PrintTypography noWrap>Telefone</PrintTypography>
            <PrintTypography>{order.customer.phone}</PrintTypography>
          </div>
          {order.shipment.shipment_method === 'delivery' && (
            <div className={classes.customerData}>
              <PrintTypography noWrap>Endereço</PrintTypography>
              <div>
                <PrintTypography>{`${order.shipment.address}, nº ${order.shipment.number}`}</PrintTypography>
                <PrintTypography>{order.shipment.district}</PrintTypography>
                <PrintTypography>{order.shipment.complement}</PrintTypography>
              </div>
            </div>
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
                {order.products.map(product => (
                  <tr key={product.id}>
                    <td className={classes.productAmount}>
                      <PrintTypography>{product.amount}x</PrintTypography>
                    </td>
                    <td className={classes.product}>
                      <PrintTypography upperCase bold>
                        {product.name} - {product.formattedFinalPrice}
                      </PrintTypography>
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
          <div className={classes.totals}>
            <div>
              <PrintTypography>Pagamento</PrintTypography>
            </div>
            <div>
              <PrintTypography>{order.payment_method.method}</PrintTypography>
            </div>
            {order.discount > 0 && (
              <>
                <div>
                  <PrintTypography>Desconto</PrintTypography>
                </div>
                <div>
                  <PrintTypography>{order.formattedDiscount}</PrintTypography>
                </div>
              </>
            )}
            {order.tax > 0 && (
              <>
                <div>
                  <PrintTypography>Taxa de entrega</PrintTypography>
                </div>
                <div>
                  <PrintTypography>{order.formattedTax}</PrintTypography>
                </div>
              </>
            )}
            {order.change > 0 && (
              <>
                <div>
                  <PrintTypography>Troco para</PrintTypography>
                </div>
                <div>
                  <PrintTypography>{order.formattedChangeTo}</PrintTypography>
                </div>
                <div>
                  <PrintTypography>Troco</PrintTypography>
                </div>
                <div>
                  <PrintTypography>{order.formattedChange}</PrintTypography>
                </div>
              </>
            )}
            <div>
              <PrintTypography>Total a pagar</PrintTypography>
            </div>
            <div>
              <PrintTypography fontSize={1.2} bold>
                {order.formattedTotal}
              </PrintTypography>
            </div>
            {order.deliverers.length > 0 && (
              <>
                {order.deliverers.map(deliverer => (
                  <Fragment key={deliverer.id}>
                    <div>
                      <PrintTypography>Entregador</PrintTypography>
                    </div>
                    <div>
                      <PrintTypography>{deliverer.name}</PrintTypography>
                    </div>
                  </Fragment>
                ))}
              </>
            )}
          </div>
          <div className={classes.developer}>
            <PrintTypography fontSize={0.9} align="center">
              www.sgrande.delivery
            </PrintTypography>
          </div>
        </div>
      )}
    </>
  );
};

export default Shipment;
